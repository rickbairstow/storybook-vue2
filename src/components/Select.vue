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
                :aria-describedby="`${id}_selected`"
                :aria-expanded="isOpen"
                :aria-label="ariaLang.inputAria"
                :id="id"
                :placeholder="search ? '' : displayedPlaceholder"
                :readonly="!searchable || disabled"
                @keydown.enter="openOptions(true)"
                @keydown.down="openOptions(true)"
                @keydown.space.prevent="!searchable && openOptions(true)"
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
        <div
            v-show="isOpen && !disabled"
            ref="optionsContainer"
            class="select-options-container"
            :style="{ ...floatingStyles, maxHeight: initialMaxHeight }"
        >
            <ul
                v-if="filteredOptions.length > 0"
                class="select-options-list"
                role="listbox"
                tabindex="0"
                :aria-description="ariaLang.listDescription"
                :aria-multiselectable="multiple"
                :id="optionsId"
            >
                <li
                    v-for="option in filteredOptions"
                    class="select-options-item"
                    role="option"
                    tabindex="0"
                    :aria-disabled="option.disabled"
                    :aria-label="option.text"
                    :aria-selected="isOptionSelected(option.value)"
                    :key="option.value"
                    @click="setSelected(option)"
                >
                    {{ option.text }}

                    <div
                        v-if="isOptionSelected(option.value)"
                        aria-hidden="true"
                        class="flex-none"
                    >
                        TICK
                    </div>
                </li>
    </ul>

            <p
                v-else
                aria-live="polite"
            >
                No options found.
            </p>

            <!-- Pagination - sends a request to the parent to load more options. -->
            <button
                v-if="hasMoreOptions"
                class="select-options-load-more"
                type="button"
                @click="requestMoreOptions()"
            >
                Load more...
            </button>
        </div>

        <!-- Assistive feedback for selected options -->
        <div
            aria-live="polite"
            class="select-sr-only"
            :id="`${id}_selected`"
        >
            {{ selectedOptionsMessage }}
        </div>
    </div>
</template>

<script>
import { computePosition, autoUpdate, offset, flip, shift, size } from '@floating-ui/dom';

export default {
    props: {
        clearable: {
            default: true,
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
                // Custom validator to make sure text and value keys exist.
                const isValid = !value || value.every(item => item?.text && item?.value)
                if (!isValid) throw new Error(
                    'Invalid options: Each option requires a "text" and "value" key.\n' +
                    JSON.stringify(value, null, 2)
                )
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
            floatingStyles: {}, // Stores computed styles
            initialMaxHeight: '0px', // Ensures no "auto" height initially
            isOpen: false,
            search: '', // Tracks the user's search input
            selectedValues: [], // Stores currently selected values
        };
    },

    computed: {
        /**
         * TODO
         * @returns {*[]}
         */
        filteredOptions() {
            if (!this.search) return this.options; // If no search term, return all options.

            const searchTerm = this.search.trim().toLowerCase();

            return this.options.filter((option) => option.text.toLowerCase().includes(searchTerm));
        },

        /**
         * TODO
         * @returns {string}
         */
        optionsId() {
            return `${this.id}_options`;
        },

        /**
         * TODO
         * @returns {number|number}
         */
        viewportMaxHeight() {
            const smBreakpoint = 640;
            return window.innerWidth < smBreakpoint
                ? window.innerHeight // Mobile: Use viewport height
                : 200; // Default: 200px maxHeight
        },

        /**
         * TODO
         * @returns {*|string}
         */
        displayedPlaceholder() {
            if (this.multiple && this.selectedValues?.length) {
                if (this.selectedValues.length === this.options.length) return 'All options selected'
                if (this.selectedValues.length > 1) return `${this.selectedValues.length} options selected`
                return this.options.find((o) => o.value === this.selectedValues[0])?.text
            }
            if (this.selectedValues.length) return this.options.find((o) => o.value === this.selectedValues[0])?.text
            return this.placeholder
        },

        /**
         * TODO
         * @returns {{inputAria: string, clearSelection: string, listDescription: string}}
         */
        ariaLang() {
            let inputAria = `Press Enter to open the list of options, and select ${this.multiple ? 'one or more options' : 'an option'}`;
            if (this.disabled) {
                inputAria = 'Select is disabled';
            } else if (this.searchable) {
                inputAria = `Type to search and select ${this.multiple ? 'one or more options' : 'an option'}`;
            }

            return {
                clearSelection: 'Clear selection',
                listDescription: `Use the arrow keys to navigate options, to select ${this.multiple ? 'one or more options' : 'an option'} press the space or enter key.`,
                inputAria
            }
        },

        /**
         * TODO
         * @returns {string}
         */
        selectedOptionsMessage() {
            if (this.selectedValues.length === 0) {
                return 'No options selected.';
            }

            const selectedText = this.options
                .filter(option => this.selectedValues.includes(option.value))
                .map(option => option.text)
                .join(', ');

            return `Selected options: ${selectedText}`;
        }
    },

    watch: {
        value: {
            immediate: true,
            handler(newValue) {
                this.setInitialSelected(newValue);
            }
        }
    },

    methods: {
        /**
         * todo
         * @param newValue
         */
        setInitialSelected(newValue) {
            const values = Array.isArray(newValue) ? newValue : [newValue];
            this.selectedValues = this.options
                .filter((option) => values.includes(option.value) && !option.disabled)
                .map((option) => option.value);
        },

        /**
         * Todo
         * @param value
         * @returns {boolean}
         */
        isOptionSelected(value) {
            return this.selectedValues.includes(value);
        },

        /**
         * Todo
         * @param option
         */
        setSelected(option) {
            if (option.disabled) return;

            const newValue = option.value;

            if (this.multiple) {
                // Toggle selection for multiple mode
                if (this.selectedValues.includes(newValue)) {
                    this.selectedValues = this.selectedValues.filter((val) => val !== newValue);
                } else {
                    this.selectedValues = [...this.selectedValues, newValue];
                }
            } else {
                // Single selection mode
                this.selectedValues = [newValue];
                this.closeOptions(true);
            }

            this.$emit('input', this.multiple ? this.selectedValues : newValue); // Emit updated values
        },

        /**
         * Todo
         * @param focus
         * @returns {Promise<void>}
         */
        async openOptions(focus = false) {
            if (this.isOpen || this.disabled) return;
            this.isOpen = true;

            this.initialMaxHeight = `${this.viewportMaxHeight}px`;
            this.initAutoPositioning();

            // Focus on the first available option when opening via keyboard controls.
            if (focus) {
                // We need to wait for options to exist in the DOM before focusing, nextTick doesn't work for this so we use requestAnimationFrame.
                await new Promise((resolve) => requestAnimationFrame(resolve));

                const options = Array.from(this.$refs.optionsContainer.querySelectorAll('.select-options-item'));
                for (const option of options) {
                    if (option.getAttribute('aria-disabled') !== 'true') {
                        option.focus(); // Focus the first enabled option
                        break;
                    }
                }
            }

            document.addEventListener('keydown', this.handleKeyDown); // Add keyboard listener
            document.addEventListener('mousedown', this.handleClickOutside); // Listen for outside clicks
        },

        /**
         * TODO
         */
        closeOptions(focus = false) {
            if (!this.isOpen || this.disabled) return;
            this.isOpen = false;

            if (focus) this.focusInput()

            this.cleanupPositioning();
            this.search = ''; // Clear search on close
            this.initialMaxHeight = '0px';
            document.removeEventListener('keydown', this.handleKeyDown); // Remove keyboard listener
            document.removeEventListener('mousedown', this.handleClickOutside); // Remove listener
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
            const container = this.$el;
            if (!container.contains(event.target)) {
                this.closeOptions(); // Close if the click is outside
            }
        },

        /**
         * TODO
         */
        initAutoPositioning() {
            const inputContainer = this.$refs.inputContainer;
            const optionsContainer = this.$refs.optionsContainer;

            if (!inputContainer || !optionsContainer) {
                console.warn("Refs are not properly initialized.");
                return;
            }

            this.cleanupAutoUpdate = autoUpdate(inputContainer, optionsContainer, () => {
                computePosition(inputContainer, optionsContainer, {
                    placement: 'bottom-start',
                    middleware: [
                        offset(1),
                        flip(),
                        shift(),
                        size({
                            apply: ({ availableHeight, elements }) => {
                                const maxHeight = Math.min(availableHeight, this.viewportMaxHeight);
                                Object.assign(elements.floating.style, {
                                    maxHeight: `${maxHeight}px`,
                                    overflowY: 'auto',
                                    width: '100%',
                                });
                            },
                        }),
                    ],
                }).then(({ x, y }) => {
                    this.floatingStyles = {
                        position: 'absolute',
                        top: `${y}px`,
                        left: `${x}px`,
                    };
                });
            });
        },

        /**
         * TODO
         */
        cleanupPositioning() {
            if (this.cleanupAutoUpdate) {
                this.cleanupAutoUpdate();
                this.cleanupAutoUpdate = null;
            }
        },

        /**
         * TODO
         * @param event
         */
        handleKeyDown(event) {
            if (!this.isOpen) return;

            const options = Array.from(this.$refs.optionsContainer.querySelectorAll('.select-options-item'));
            const enabledOptions = options.filter((option) => option.getAttribute('aria-disabled') !== 'true');
            const focusedIndex = enabledOptions.indexOf(document.activeElement);

            if (event.key === 'ArrowDown') {
                event.preventDefault(); // Prevent page scrolling

                // Focus the next enabled option
                const nextIndex = focusedIndex === -1 ? 0 : (focusedIndex + 1) % enabledOptions.length;
                enabledOptions[nextIndex]?.focus();
                return;
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault(); // Prevent page scrolling

                // Focus the previous enabled option
                const prevIndex = focusedIndex === -1 ? enabledOptions.length - 1 : (focusedIndex - 1 + enabledOptions.length) % enabledOptions.length;
                enabledOptions[prevIndex]?.focus();
                return;
            }

            // Handle selection only if focused on an option
            if ((event.key === 'Enter' || event.key === ' ') && options.includes(document.activeElement)) {
                event.preventDefault();

                // Select the currently focused option
                if (document.activeElement && enabledOptions.includes(document.activeElement)) {
                    const option = this.filteredOptions[options.indexOf(document.activeElement)];
                    this.setSelected(option);
                }
                return;
            }

            // Allow native Tab behavior to exit the options dropdown
            if (event.key === 'Tab') {
                this.closeOptions();
            }
        },

        /**
         * TODO
         */
        clearSelection() {
            this.selectedValues = [];
            this.$emit('input', this.multiple ? [] : null);

            this.focusInput()
        },

        /**
         * TODO
         */
        focusInput() {
            this.$refs.inputContainer.querySelector('input').focus();
        },

        /**
         * Todo - when we have more results we need to request them from the parent.
         */
        requestMoreOptions() {
            this.$emit('load-more-options')
        }
    },

    /**
     * Clean up event listeners.
     */
    beforeDestroy() {
        this.cleanupPositioning()
        document.removeEventListener('mousedown', this.handleClickOutside)
    },
};
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

.select-options-item {
    cursor: pointer;
    display: flex;
    gap: 8px;
    justify-content: space-between;
    padding: 8px 16px;
}

.select-options-item[aria-disabled="true"] {
    background-color: #eee;
    color: #666;
    cursor: not-allowed;
    pointer-events: none;
}

.select-options-load-more:hover,
.select-options-load-more:focus,
.select-options-item:hover,
.select-options-item:focus {
    background-color: #eee;
}

.select-options-load-more {
    all: unset;

    box-sizing: border-box;
    cursor: pointer;
    padding: 8px 16px;
    width: 100%;
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
.select-input-clear:focus {
    outline: 1px solid; /* todo need to check whats in UiKit for this re: color */
}

.select-options-item:focus {
    outline: none;
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
