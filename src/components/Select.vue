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
                v-if="clearable && this.selectedValues.length && !disabled"
                class="select-input-clear"
                type="button"
                :aria-label="ariaLang.clearSelection"
                @click="clearSelection"
            >
                X
            </button>
        </div>

        <!-- Options list -->
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
            </template>

            <!-- No options feedback -->
            <p
                v-else
                aria-live="polite"
            >
                No options found.
            </p>

            <!-- Load more options -->
            <button
                v-if="hasMoreOptions"
                ref="loadMoreButton"
                class="select-options-load-more"
                type="button"
                tabindex="0"
                :aria-disabled="loadingMore"
                :class="{ 'select-options-load-more--disabled': loadingMore }"
                @click="requestMoreOptions()"
            >
                {{ loadingMore ? 'Loading...' : 'Load more...' }}
            </button>
        </div>

        <!-- Assistive feedback for selected options -->
        <div
            v-if="!disabled"
            aria-live="polite"
            class="select-sr-only"
            :id="`${id}_selected_values`"
        >
            {{ selectedOptionsMessage }}
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
            type: Boolean,
        },
        multiple: {
            type: Boolean,
            default: false,
        },
        options: {
            type: Array,
            default: () => [],
            validator: (value) => {
                // Checks that the data structure contains text and value keys, for both flat and grouped objects.
                const isValid = !value || value.every(item => {
                    // If the item is a group, it must have a "label" and "options" array
                    if (item.group) {
                        return typeof item.group === 'string' &&
                            Array.isArray(item.options) &&
                            item.options.every(option => option?.text && option?.value)
                    }
                    // If the item is not a group, it must have "text" and "value"
                    return item?.text && item?.value
                })

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
            cleanupAutoUpdate: null,
            currentOptionsLength: 0,
            floatingStyles: {},
            initialMaxHeight: 0,
            isOpen: false,
            loadingMore: false,
            search: '',
            selectedValues: [],
        }
    },

    mounted() {
        // Sets the initial length, which helps us set focus when loading more options.
        this.currentOptionsLength = this.options?.length
    },

    computed: {
        /**
         * TODO
         * @returns {*[]}
         */
        filteredOptions() {
            if (!this.search) return this.options

            const searchTerm = this.search.trim().toLowerCase()

            return this.options.map(item => {
                if (item.group) {
                    const filteredGroupOptions = item.options.filter(option =>
                        option.text.toLowerCase().includes(searchTerm)
                    )
                    return filteredGroupOptions.length
                        ? { group: item.group, options: filteredGroupOptions }
                        : null
                } else if (item.text.toLowerCase().includes(searchTerm)) {
                    return item
                }
                return null
            }).filter(Boolean)
        },

        /**
         * TODO
         * @returns {string}
         */
        optionsId() {
            return `${this.id}_options`
        },

        /**
         * TODO
         * @returns {number|number}
         */
        viewportMaxHeight() {
            const smBreakpoint = 640
            return window.innerWidth < smBreakpoint
                ? window.innerHeight // Mobile: Use viewport height
                : 200 // Default: 200px maxHeight
        },

        /**
         * TODO
         * @returns {*|string}
         */
        displayedPlaceholder() {
            return this.selectedText || this.placeholder
        },

        /**
         * TODO abstracted selected text
         * @returns {*|string|null|string}
         */
        selectedText() {
            if (this.multiple && this.selectedValues?.length) {
                if (this.selectedValues.length === this.options.flatMap(o => (o.group ? o.options : o)).length) {
                    return 'All options selected'
                }
                if (this.selectedValues.length > 1) {
                    return `${this.selectedValues.length} options selected`
                }
                const selectedOption = this.options
                    .flatMap(o => (o.group ? o.options : o))
                    .find(option => option.value === this.selectedValues[0])
                return selectedOption ? selectedOption.text : this.placeholder
            }
            if (this.selectedValues.length) {
                const selectedOption = this.options
                    .flatMap(o => (o.group ? o.options : o))
                    .find(option => option.value === this.selectedValues[0])
                return selectedOption ? selectedOption.text : this.placeholder
            }
            return null
        },

        /**
         * TODO
         * @returns {{inputAria: string, clearSelection: string, listDescription: string}}
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
         * TODO
         * @returns {string}
         */
        selectedOptionsMessage() {
            if (this.selectedValues.length === 0) {
                return 'No options selected.'
            }

            const selectedText = this.options
                .filter(option => this.selectedValues.includes(option.value))
                .map(option => option.text)
                .join(', ')

            return `Selected options: ${selectedText}`
        }
    },

    methods: {
        /**
         * todo
         * @param newValue
         */
        setInitialSelected(newValue) {
            const values = Array.isArray(newValue) ? newValue : [newValue]

            // Flatten grouped options to simplify value matching
            const flattenedOptions = this.options.flatMap(option =>
                option.group ? option.options : option
            )

            // Filter and map unique values
            this.selectedValues = [...new Set(flattenedOptions
                .filter(option => values.includes(option.value) && !option.disabled)
                .map(option => option.value)
            )]
        },

        /**
         * Todo
         * @param value
         * @returns {boolean}
         */
        isOptionSelected(value) {
            return !!this.selectedValues?.includes(value)
        },

        /**
         * Todo
         * @param option
         */
        setSelected(option) {
            if (option.disabled) return

            const newValue = option.value

            if (this.multiple) {
                // Toggle selection for multiple mode
                if (this.selectedValues.includes(newValue)) {
                    this.selectedValues = this.selectedValues.filter(val => val !== newValue)
                } else {
                    this.selectedValues = [...this.selectedValues, newValue]
                }
            } else {
                // Single selection mode
                this.selectedValues = [newValue]
                this.closeOptions(true)
            }

            this.$emit('input', this.multiple ? this.selectedValues : newValue) // Emit updated values
        },

        /**
         * Todo
         * @param focus
         * @returns {Promise<void>}
         */
        async openOptions(focus = false) {
            if (this.isOpen || this.disabled) return
            this.isOpen = true

            this.initialMaxHeight = this.viewportMaxHeight
            this.initAutoPositioning()

            // Focus on the first available option when opening via keyboard controls.
            if (focus) {
                // We need to wait for options to exist in the DOM before focusing, nextTick doesn't work for this so we use requestAnimationFrame.
                await new Promise((resolve) => requestAnimationFrame(resolve))

                const options = Array.from(this.$refs.optionsContainer.querySelectorAll('.select-options-item'))
                for (const option of options) {
                    if (option.getAttribute('aria-disabled') !== 'true') {
                        option.focus() // Focus the first enabled option
                        break
                    }
                }
            }

            document.addEventListener('keydown', this.handleKeyDown) // Add keyboard listener
            document.addEventListener('mousedown', this.handleClickOutside) // Listen for outside clicks
        },

        /**
         * TODO
         */
        closeOptions(focus = false) {
            if (!this.isOpen || this.disabled) return
            this.isOpen = false

            if (focus) this.focusInput()

            this.cleanupPositioning()
            this.search = ''
            this.initialMaxHeight = 0
            document.removeEventListener('keydown', this.handleKeyDown)
            document.removeEventListener('mousedown', this.handleClickOutside)
        },

        /**
         * TODO used specifically for when search is disabled, toggles when clicking the input.
         */
        toggleOptions() {
            if (this.disabled) return

            this.isOpen ? this.closeOptions() : this.openOptions()
        },

        /**
         * TODO
         * @param event
         */
        handleClickOutside(event) {
            const container = this.$el
            if (!container.contains(event.target)) {
                this.closeOptions() // Close if the click is outside
            }
        },

        /**
         * TODO
         */
        initAutoPositioning() {
            const inputContainer = this.$refs.inputContainer
            const optionsContainer = this.$refs.optionsContainer

            if (!inputContainer || !optionsContainer) return

            this.cleanupAutoUpdate = autoUpdate(inputContainer, optionsContainer, () => {
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
         * TODO
         */
        cleanupPositioning() {
            if (this.cleanupAutoUpdate) {
                this.cleanupAutoUpdate()
                this.cleanupAutoUpdate = null
            }
        },

        /**
         * TODO
         * @param event
         */
        handleKeyDown(event) {
            if (!this.isOpen) return

            const flatFilteredOptions = this.filteredOptions.flatMap(option =>
                option.group ? option.options : option
            )
            const options = Array.from(this.$refs.optionsContainer.querySelectorAll('.select-options-item'))
            const loadMoreButton = this.$refs.loadMoreButton
            const navigableElements = [...options, loadMoreButton].filter(Boolean) // Include the Load More button

            const focusedIndex = navigableElements.indexOf(document.activeElement)

            if (event.key === 'ArrowDown') {
                event.preventDefault() // Prevent page scrolling

                // Focus the next element
                const nextIndex = focusedIndex === -1 ? 0 : (focusedIndex + 1) % navigableElements.length
                navigableElements[nextIndex]?.focus()
            } else if (event.key === 'ArrowUp') {
                event.preventDefault() // Prevent page scrolling

                // Focus the previous element
                const prevIndex = focusedIndex === -1 ? navigableElements.length - 1 : (focusedIndex - 1 + navigableElements.length) % navigableElements.length
                navigableElements[prevIndex]?.focus()
            } else if (event.key === 'Enter' || (event.key === ' ' && document.activeElement !== this.$refs.inputContainer.querySelector('input'))) {
                // Handle Enter or Space only when not focused on input
                event.preventDefault()

                if (document.activeElement) {
                    const isOption = document.activeElement.classList.contains('select-options-item')
                    const isLoadMore = document.activeElement === loadMoreButton

                    if (isOption) {
                        // Get the index of the active DOM element
                        const optionIndex = options.indexOf(document.activeElement)
                        const selectedOption = flatFilteredOptions[optionIndex]

                        if (selectedOption) {
                            this.setSelected(selectedOption)
                        }
                    } else if (isLoadMore) {
                        // Trigger "Load More"
                        this.requestMoreOptions()
                    }
                }
            } else if (event.key === 'Tab') {
                // Allow Tab to exit the dropdown
                this.closeOptions()
            }
        },

        /**
         * TODO
         */
        clearSelection() {
            this.selectedValues = []
            this.$emit('input', this.multiple ? [] : null)

            this.closeOptions()
            this.focusInput()
        },

        /**
         * TODO
         */
        focusInput() {
            this.$refs.inputContainer.querySelector('input').focus()
        },

        /**
         * Todo - when we have more results we need to request them from the parent.
         */
        requestMoreOptions() {
            if (this.loadingMore) return // Prevent multiple requests
            this.loadingMore = true // Start loading state
            this.$emit('load-more-options')
        }
    },

    watch: {
        /**
         * Open the options when the user starts typing.
         * @param newValue
         */
        search(newValue) {
            if (newValue && !this.isOpen && !this.disabled) this.openOptions()
        },

        // TODO - Track values to update selected values from the parent.
        value: {
            immediate: true,
            handler(newValue) {
                this.setInitialSelected(newValue)
            }
        },

        /**
         * TODO
         * @param updatedOptions
         */
        options: {
            immediate: true,
            handler(updatedOptions) {
                if (this.loadingMore) {
                    const optionsContainer = this.$refs.optionsContainer

                    if (optionsContainer) {
                        // Handle grouped options
                        const allGroups = Array.from(optionsContainer.querySelectorAll('[role="group"]'))

                        if (allGroups.length > 0) {
                            const lastGroup = allGroups[allGroups.length - 1]
                            const lastItem = lastGroup.querySelector('.select-options-item:last-child')

                            if (lastItem) {
                                lastItem.focus() // Focus the last item in the last group
                            }
                        } else {
                            // Handle ungrouped options
                            const allOptions = Array.from(optionsContainer.querySelectorAll('.select-options-item'))

                            if (allOptions.length > this.currentOptionsLength) {
                                allOptions[this.currentOptionsLength]?.focus() // Focus the first newly added option
                            }
                        }
                    }

                    this.currentOptionsLength = updatedOptions.length // Update the length
                    this.loadingMore = false // Reset loading state
                } else {
                    this.currentOptionsLength = updatedOptions.length // Regular update
                }
            }
        }
    },

    /**
     * Clean up event listeners.
     */
    beforeDestroy() {
        this.cleanupPositioning()
        document.removeEventListener('mousedown', this.handleClickOutside)
    },
}
</script>


<!-- todo might not need to be scoped -->
<style scoped>
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
    padding: 0 .5rem;
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
    transition: all 0.2s ease;
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

.select-options-item {
    cursor: pointer;
    display: flex;
    gap: 8px;
    justify-content: space-between;
    padding: 8px 16px;
}

.select-options-item[aria-disabled="true"],
.select-options-item[aria-disabled="true"]:hover,
.select-options-item[aria-disabled="true"]:focus {
    background-color: #eee;
    color: #666;
    cursor: not-allowed;
    pointer-events: none;
}

.select-options-load-more:hover,
.select-options-load-more:focus,
.select-options-item:hover,
.select-options-item:focus {
    background-color: #ccc;
}

.select-options-item--check {
    display: none;
}

.select-options-item[aria-selected="true"] .select-options-item--check {
    display: block;
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
</style>
