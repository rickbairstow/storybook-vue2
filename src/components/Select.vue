<template>
    <div
        class="select-container"
        @keydown.esc="closeOptions(true)"
    >
        <!-- Input / Search -->
        <div
            ref="inputContainer"
            class="select-input-container"
            :class="{
                'select-input-container--disabled': disabled,
                'select-input-container--wide': wide
            }"
        >
            <input
                v-model="search"
                aria-haspopup="listbox"
                autocomplete="off"
                class="select-input-input"
                type="text"
                :aria-controls="optionsId"
                :aria-describedby="`${id}_instructions`"
                :aria-expanded="isOpen"
                :aria-label="ariaLang.inputLabel"
                :id="id"
                :placeholder="search ? '' : displayedPlaceholder"
                :readonly="!searchable || disabled"
                @keydown.enter="openOptions(true)"
                @keydown.down="openOptions(true)"
                @keydown.space="searchable || openOptions(true)"
                @click="searchable ? openOptions() : toggleOptions()"
            />

            <button
                v-if="clearable && this.selectedValue.length && !disabled"
                class="select-input-clear"
                type="button"
                :aria-label="ariaLang.clearSelection"
                @click="clearSelection"
            >
                X
            </button>
        </div>

        <!-- Options list -->
        <div
            v-show="isOpen && !disabled"
            ref="optionsContainer"
            class="select-options-container"
            role="listbox"
            :id="optionsId"
            :style="{ ...floatingStyles, maxHeight: `${initialMaxHeight}px` }"
        >
            <template v-if="filteredOptions.length > 0">
                <template v-for="(item, index) in filteredOptions">
                    <!-- Grouped options -->
                    <template v-if="item.group">
                        <div
                            :key="`select_group_${index}`"
                            class="select-options-group-header"
                            role="presentation"
                            :aria-label="`Group: ${item.group}`"
                        >
                            {{ item.group }}
                        </div>

                        <ul
                            class="select-options-list"
                            :key="`group-options-${item.group}`"
                            role="group"
                            :aria-labelledby="`select_group_${index}`"
                        >
                            <li
                                v-for="option in item.options"
                                class="select-options-item"
                                role="option"
                                tabindex="0"
                                :aria-disabled="option.disabled"
                                :aria-label="option.text"
                                :aria-selected="isOptionSelected(option.value) ? 'true' : 'false'"
                                :key="option.value"
                                @click="setSelected(option)"
                            >
                                {{ option.text }}
                                <div
                                    class="select-options-item--check"
                                    aria-hidden="true"
                                >
                                    TICK
                                </div>
                            </li>
                        </ul>
                    </template>
                </template>

                <!-- Ungrouped options -->
                <ul
                    v-if="filteredOptions.some(item => !item.group)"
                    class="select-options-list"
                    :key="'ungrouped-options'"
                >
                    <li
                        v-for="(item, index) in filteredOptions.filter(option => !option.group)"
                        class="select-options-item"
                        role="option"
                        tabindex="0"
                        :aria-disabled="item.disabled"
                        :aria-label="item.text"
                        :aria-selected="isOptionSelected(item.value) ? 'true' : 'false'"
                        :key="item.value || `option-${index}`"
                        @click="setSelected(item)"
                    >
                        {{ item.text }}
                        <div
                            class="select-options-item--check"
                            aria-hidden="true"
                        >
                            TICK
                        </div>
                    </li>
                </ul>

                <!-- Load more options -->
                <button
                    v-if="hasMoreOptions"
                    ref="loadMoreButton"
                    class="select-options-load-more"
                    type="button"
                    tabindex="0"
                    :aria-disabled="loading"
                    :class="{ 'select-options-load-more--disabled': loading }"
                    @click="requestMoreOptions()"
                >
                    {{ loading ? 'Loading...' : 'Load more options' }}
                </button>
            </template>

            <!-- No options feedback -->
            <p
                v-else
                aria-live="polite"
                class="select-options-none"
            >
                No options found.
            </p>
        </div>

        <!-- Assistive feedback for selected options -->
        <div
            v-if="!disabled && selectedAssistiveText"
            aria-live="polite"
            class="select-sr-only"
            :id="`${id}_selected_values`"
        >
            {{ selectedAssistiveText }}
        </div>

        <!-- Assistive feedback for instructions -->
        <div
            id="id_instructions"
            class="select-sr-only"
        >
            {{ ariaLang.instructions }}
        </div>
    </div>
</template>

<script>
import { computePosition, autoUpdate, offset, flip, shift, size } from '@floating-ui/dom'

export default {
    props: {
        clearable: {
            default: false,
            type: Boolean
        },
        disabled: {
            default: false,
            type: Boolean
        },
        id: {
            required: true,
            type: String,
        },
        hasMoreOptions: {
            default: false,
            type: Boolean
        },
        loading: {
            default: false,
            type: Boolean
        },
        multiple: {
            default: false,
            type: Boolean
        },
        options: {
            default: () => [],
            type: Array,
            validator: (value) => {
                // Custom validator to check that the data structure contains text and value keys, for both single and grouped options.
                if (!value) return false

                const isValid = value.every(item =>
                    item.group ?
                        (
                            typeof item.group === 'string' &&
                            Array.isArray(item.options) &&
                            item.options.every(option => option?.text && option?.value)
                        ) :
                        item?.text && item?.value
                )

                // Throw a custom error to give better context, instead of Vue's limited "invalid prop" error.
                if (!isValid) {
                    throw new Error(
                        'Invalid options: Each item must be an option with "text" and "value", or a group with "label" and "options".\n' +
                        JSON.stringify(value, null, 2)
                    )
                }

                return isValid
            }
        },
        placeholder: {
            type: String,
            default: 'Select an option.',
        },
        searchable: {
            default: true,
            type: Boolean,
        },
        wide: {
            default: false,
            type: Boolean
        },
        value: {
            type: [String, Number, Array],
            default: null,
        },
    },

    data() {
        return {
            breakpoints: {
                sm: 640
            },
            currentOptionsLength: 0,
            floatingStyles: {},
            initialMaxHeight: 0,
            isOpen: false,
            search: '',
            selectedValue: []
        }
    },

    mounted() {
        // Sets the current options length, this helps us know when more options have been loaded from the parent.
        this.currentOptionsLength = this.options?.length
    },

    computed: {
        /**
         * Returns filtered options based upon the provided options and the user's search term. Covering both singular
         * and grouped options.
         * @returns {Array} - returns an array of options.
         */
        filteredOptions() {
            if (!this.options) return []
            if (!this.search) return this.options

            const searchTerm = this.search.trim().toLowerCase()

            return this.options?.map(item => {
                // Grouped
                if (item.group) {
                    const filteredGroupOptions = item.options.filter(option =>
                        option.text.toLowerCase().includes(searchTerm)
                    )
                    return filteredGroupOptions.length
                        ? { group: item.group, options: filteredGroupOptions }
                        : null
                }

                // Single
                if (item.text.toLowerCase().includes(searchTerm)) return item
            })?.filter(Boolean)
        },

        /**
         * Centralises the options ID for use in multiple places.
         * @returns {string}
         */
        optionsId() {
            return `${this.id}_options`
        },

        /**
         * Calculates the max viewport height for the dropdown, based upon the small breakpoint.
         * @returns {number}
         */
        viewportMaxHeight() {
            return window.innerWidth < this.breakpoints.sm
                ? window.innerHeight
                : 200
        },

        /**
         * Calculates the text to display as placeholder on the input, providing the user with feedback on the current
         * selection. For multiselects the text is truncated by using "x options selected".
         * @returns {string|null}
         */
        displayedPlaceholder() {
            const allOptions = this.options?.flatMap(
                item => (item.group ? item.options : item)
            ) || []
            const selectedCount = this.selectedValue?.length || 0

            if (this.multiple && selectedCount) {
                const pluralisation = selectedCount > 1 ? 's' : ''
                return selectedCount === allOptions.length
                    ? 'All options selected'
                    : `${selectedCount} option${pluralisation} selected`
            }

            if (selectedCount) {
                const selectedOption = allOptions.find(option => option.value === this.selectedValue[0])
                return selectedOption?.text || this.placeholder
            }

            return this.placeholder || null
        },

        /**
         * Collates aria language strings into one computed object.
         * @returns {{clearSelection: string, listDescription: string, inputLabel: string, instructions: string}}
         */
        ariaLang() {
            const controls = `Use the arrow keys to navigate, and press Enter or Space to select ${this.multiple ? 'one or more options' : 'an option'}.`
            const searchHelp = this.searchable ? 'Type to search, ' : ''
            const instructions = `Press Enter to open the list of options. ${searchHelp}${controls}`

            const selectedText = this.selectedText ? `${this.selectedText}.` : ''
            const inputLabel = this.disabled
                ? `${selectedText} Select is disabled.`
                : `${selectedText} ${instructions}`

            return {
                clearSelection: 'Clear selection',
                listDescription: controls,
                inputLabel,
                instructions: this.disabled ? '' : instructions, // Only include instructions if not disabled
            }
        },

        /**
         * ASSISTIVE TECH ONLY
         * Calculates text to announce for assistive tech when selecting or deselecting values. This does not output
         * visually, it is read out when using screen readers.
         * @returns { string }
         */
        selectedAssistiveText() {
            const selectedText = this.options
                ?.filter(option => this.selectedValue?.includes(option.value))
                .map(option => option.text)
                .join(', ')

            return selectedText ? `Selected options: ${selectedText}` : 'No options selected.'
        }
    },

    methods: {
        /**
         * Clears the selected values and emits to the parent. This lets us provide a means to "reset" selected values
         * to empty if we need to deselect.
         */
        clearSelection() {
            this.$emit('input', this.multiple ? [] : null)
            this.selectedValue = []

            this.closeOptions()
            this.focusInput()
        },


        /**
         * Closes the options, resets related states, and cleans up event listeners.
         * @param { boolean } [focus=false] - Sets if focus should return to the input when closing.
         */
        closeOptions(focus = false) {
            if (!this.isOpen || this.disabled) return
            this.isOpen = false

            if (focus) this.focusInput()

            this.search = ''
            this.initialMaxHeight = 0
            document.removeEventListener('keydown', this.handleKeyDown)
            document.removeEventListener('mousedown', this.handleClickOutside)
        },

        /**
         * Triggers focus on the inputContainer's input element.
         */
        focusInput() {
            this.$refs.inputContainer?.querySelector('input')?.focus()
        },

        /**
         * Handles clicking outside the select component and triggers close.
         * @param { MouseEvent } event
         */
        handleClickOutside(event) {
            const container = this.$el
            if (!container.contains(event.target)) this.closeOptions()
        },

        /**
         * Handles keyboard navigation and controls.
         * Implements arrow key navigation, enter/space for selection, and tab to exit focus.
         * @param { KeyboardEvent } event
         */
        handleKeyDown(event) {
            if (!this.isOpen) return

            const flatFilteredOptions = this.filteredOptions?.flatMap(
                option => option.group ? option.options : option
            )
            const options = Array.from(this.$refs.optionsContainer?.querySelectorAll('.select-options-item'))
            const loadMoreButton = this.$refs.loadMoreButton
            const navigableElements = [...options, loadMoreButton].filter(Boolean)

            const focusedIndex = navigableElements.indexOf(document.activeElement)

            if (event.key === 'ArrowDown') {
                event.preventDefault() // Stops the element scrolling with arrow keys
                const nextIndex =
                    focusedIndex === -1 ?
                        0 :
                        (focusedIndex + 1) % navigableElements.length
                navigableElements[nextIndex]?.focus()
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault() // Stops the element scrolling with arrow keys
                const prevIndex =
                    focusedIndex === -1 ?
                        navigableElements.length - 1 :
                        (focusedIndex - 1 + navigableElements.length) % navigableElements.length
                navigableElements[prevIndex]?.focus()
            }

            if (
                event.key === 'Enter' ||
                (
                    event.key === ' ' &&
                    document.activeElement !== this.$refs.inputContainer.querySelector('input')
                )
            ) {
                event.preventDefault()

                if (document.activeElement) {
                    const isOption = document.activeElement?.classList.contains('select-options-item')
                    const isLoadMore = document.activeElement === loadMoreButton

                    if (isOption) {
                        const optionIndex = options.indexOf(document.activeElement)
                        const selectedOption = flatFilteredOptions?.[optionIndex]

                        if (selectedOption) this.setSelected(selectedOption)
                    }

                    // Trigger load more
                    if (isLoadMore) this.requestMoreOptions()
                }
            }

            // Trigger close when tabbing away from the options.
            if (event.key === 'Tab') {
                this.closeOptions()
            }
        },

        /**
         * Initialises FloatingUi and adapts positioning automatically.
         */
        initAutoPositioning() {
            const inputContainer = this.$refs.inputContainer
            const optionsContainer = this.$refs.optionsContainer

            if (!inputContainer || !optionsContainer) return

            autoUpdate(inputContainer, optionsContainer, () => {
                computePosition(inputContainer, optionsContainer, {
                    placement: 'bottom-start',
                    middleware: [
                        offset(1),
                        flip(),
                        shift(),
                        size({
                            apply: ({ availableHeight, elements }) => {
                                const maxHeight = Math.min(availableHeight, this.viewportMaxHeight)
                                Object.assign(elements.floating.style, {
                                    maxHeight: `${maxHeight}px`,
                                    overflowY: 'auto',
                                    width: '100%',
                                })
                            },
                        }),
                    ],
                }).then(({ x, y }) => {
                    this.floatingStyles = {
                        position: 'absolute',
                        top: `${y}px`,
                        left: `${x}px`,
                    }
                })
            })
        },

        /**
         * Checks if the given option is selected.
         * @param {string|number} value
         * @returns {boolean}
         */
        isOptionSelected(value) {
            return !!this.selectedValue?.includes(value)
        },

        /**
         * Opens the options dropdown and runs initial positioning.
         * @param { boolean } [focus=false] - Focuses on the first enabled option when opening.
         * @returns {Promise<void>}
         */
        openOptions(focus = false) {
            if (this.isOpen || this.disabled) return

            this.isOpen = true
            this.initialMaxHeight = this.viewportMaxHeight
            this.initAutoPositioning()

            if (focus) {
                new Promise((resolve) => {
                    requestAnimationFrame(resolve)
                }).then(() => {
                    const options = Array.from(this.$refs.optionsContainer.querySelectorAll('.select-options-item'))
                    for (let i = 0; i < options.length; i++) {
                        const option = options[i]
                        if (option.getAttribute('aria-disabled') !== 'true') {
                            option.focus()
                            break
                        }
                    }
                })
            }

            document.addEventListener('keydown', this.handleKeyDown)
            document.addEventListener('mousedown', this.handleClickOutside)
        },

        /**
         * Emits a "load-more-options" event to the parent, this puts responsibility of loading options on the
         * parent, including the provision of loading state.
         */
        requestMoreOptions() {
            this.$emit('load-more-options')
        },

        /**
         * Sets the initial selected values that are passed down from the parent via the watcher. Handling both
         * grouped (multiselect) and ungrouped options.
         * @param {Array|string|number} newValue - the selected values.
         */
        setInitialSelected(newValue) {
            const values = Array.isArray(newValue) ? newValue : [newValue];

            const flattenedOptions = this.options?.flatMap(
                option => option.group ? option.options : option
            )

            this.selectedValue = flattenedOptions
                ?.filter(option => values.includes(option.value))
                .map(option => option.value)
                .reduce((unique, value) => {
                    if (!unique.includes(value)) unique.push(value);
                    return unique;
                }, [])
        },

        /**
         * Manages selection and emits the updated value(s) to the parent. Emits an array of values for multiple select
         * or single value for single select - similar to Vue's default behaviour.
         * @param {Object} option - The selected option object.
         */
        setSelected(option) {
            if (option.disabled) return

            const newValue = option.value

            if (this.multiple) {
                this.selectedValue =
                    this.selectedValue.includes(newValue) ?
                        this.selectedValue.filter(val => val !== newValue) :
                        this.selectedValue = [...this.selectedValue, newValue]
            } else {
                this.selectedValue = [newValue]
                this.closeOptions(true)
            }

            this.$emit('input', this.multiple ? this.selectedValue : newValue)
        },

        /**
         * Toggle options - this is used specifically for when search is disabled, to provide a way to toggle.
         */
        toggleOptions() {
            if (this.disabled) return

            this.isOpen ? this.closeOptions() : this.openOptions()
        },

        /**
         * Abstracted logic to calculate what element we need to focus on when loading more options.
         * @returns {*|null}
         */
        calculateFocusTarget() {
            const optionsContainer = this.$refs.optionsContainer
            if (!optionsContainer) return null

            const allOptions = Array.from(optionsContainer?.querySelectorAll('.select-options-item'))
            return allOptions.length > 0 ? allOptions[allOptions.length - 1] : null
        }
    },

    watch: {
        /**
         * Handles external option updates, ie load more, managing focus, tracking option length, and resetting the loading state.
         * @param {Array} updatedOptions
         */
        options: {
            immediate: true,
            handler(updatedOptions) {
                if (this.currentOptionsLength !== updatedOptions?.length) {
                    const focusTarget = this.calculateFocusTarget()
                    if (focusTarget) focusTarget?.focus()

                }
                this.currentOptionsLength = updatedOptions.length
            }
        },

        /**
         * Open the options when the user starts typing.
         * @param newValue
         */
        search(newValue) {
            if (newValue && !this.isOpen && !this.disabled) this.openOptions()
        },

        /**
         * Tracks changes to values passed in from the parent, and updates the selected values.
         */
        value: {
            immediate: true,
            handler(newValue) {
                this.setInitialSelected(newValue)
            }
        }
    },

    /**
     * Clean up event listeners.
     */
    beforeDestroy() {
        document.removeEventListener('mousedown', this.handleClickOutside)
    },
}
</script>

<style>
.select-container {
    font-size: 16px; /* reset */
    position: relative;
}

.select-input-container {
    align-items: center;
    border: 1px solid #ccc;
    border-radius: 8px;
    box-sizing: border-box;
    display: flex;
    height: 40px;
    max-width: 100%;
    overflow: hidden;
    width: 100%;
}

.select-input-container--disabled {
    background: #eee;
    cursor: not-allowed;
    pointer-events: none;
}

.select-input-input {
    all: unset; /* reset */

    box-sizing: border-box;
    display: block;
    height: 100%;
    min-width: 0;
    padding: 0 12px;
    width: 100%;
}

.select-input-input:placeholder-shown {
    text-overflow: ellipsis;
}

.select-input-clear {
    all: unset; /* reset */

    align-items: center;
    background: transparent;
    box-sizing: border-box;
    cursor: pointer;
    display: flex;
    height: 100%;
    justify-content: center;
    width: 44px;
}

.select-input-clear:hover,
.select-input-clear:focus {
    background: #eee;
}

.select-options-container {
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    color: #000;
    position: relative;
    transition: transform 0.2s ease, opacity 0.2s ease;
    z-index: 10;
}

.select-options-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.select-options-group-header {
    font-weight: 700;
    padding: 8px 16px;
    background-color: #f9f9f9;
    border-bottom: 1px solid #ddd;
}

.select-options-container .select-options-group-header:not(:first-of-type) {
    border-top: 1px solid #ccc;
}

.select-options-item,
.select-options-none {
    margin: 0;
    padding: 8px 16px;
}

.select-options-item {
    cursor: pointer;
    display: flex;
    gap: 8px;
    justify-content: space-between;
}

.select-options-item[aria-disabled="true"],
.select-options-item[aria-disabled="true"]:hover,
.select-options-item[aria-disabled="true"]:focus {
    background-color: #eee;
    color: #666;
    cursor: not-allowed;
    pointer-events: none;
}

.select-options-item:hover,
.select-options-item:focus,
.select-options-load-more:hover,
.select-options-load-more:focus {
    background-color: #ccc;
}

.select-options-item--check {
    display: none;
}

.select-options-item[aria-selected="true"] .select-options-item--check {
    display: block;
    flex: none;
}

.select-options-load-more {
    all: unset;

    box-sizing: border-box;
    cursor: pointer;
    padding: 8px 16px;
    width: 100%;
}

.select-options-load-more--disabled {
    pointer-events: none;
}

.select-sr-only {
    border: 0;
    clip: rect(0, 0, 0, 0);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    white-space: nowrap;
    width: 1px;
}

.select-input-container:focus-within,
.select-input-clear:focus,
.select-options-item:focus,
.select-options-load-more:focus {
    outline: 1px solid;
}
.select-options-item:focus,
.select-options-load-more:focus {
    outline-offset: -1px;
}

@media (min-width: 640px) {
    .select-input-container {
        width: 224px;
    }

    .select-input-container--wide {
        width: 100%;
    }
}

/**
 * Temporary... these are on the dashboard as default css classes.
 */
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}
::-webkit-scrollbar-thumb {
    background: #C0C0C0;
    border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
    background: #878787;
}
::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0);
}
</style>
