<template>
    <div
        class="select-container"
        @keydown.esc="closeOptions(true)"
    >
        <!-- Search area -->
        <div
            ref="inputContainer"
            class="select-input-container"
            :class="{ 'select-input-container--disabled': disabled }"
        >
            <input
                v-model="search"
                aria-label="Select an option"
                autocomplete="off"
                class="select-input-input"
                type="text"
                :aria-controls="optionsId"
                :id="id"
                :placeholder="search ? '' : displayedPlaceholder"
                :readonly="!searchable || disabled"
                @keydown.enter="openOptions(true)"
                @keydown.down="openOptions(true)"
                @click="searchable ? openOptions() : toggleOptions()"
            />

            <button
                v-if="clearable && this.selectedValues.length && !disabled"
                aria-label="Clear selection"
                class="select-input-clear"
                type="button"
                @click="clearSelection"
            >
                X
            </button>
        </div>

        <!-- Options dropdown -->
        <div
            v-show="isOpen && !disabled"
            ref="optionsContainer"
            class="select-options-container"
            :style="{ ...floatingStyles, maxHeight: initialMaxHeight }"
        >
            <ul
                v-if="filteredOptions.length > 0"
                aria-description="Use the arrow keys to navigate options, press enter to select an option"
                aria-label="Options list"
                class="select-options-list"
                role="listbox"
                tabindex="0"
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
            >
                No options found.
            </p>
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
        inputAria: {
            type: String,
            default: 'Select an option',
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
                if (!isValid) throw new Error('Invalid options: Each option must have a "text" and "value" key.')
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
        filteredOptions() {
            if (!this.search) return this.options; // If no search term, return all options.

            const searchTerm = this.search.trim().toLowerCase();

            return this.options.filter((option) => option.text.toLowerCase().includes(searchTerm));
        },

        optionsId() {
            return `${this.id}_options`;
        },

        viewportMaxHeight() {
            const smBreakpoint = 640;
            return window.innerWidth < smBreakpoint
                ? window.innerHeight // Mobile: Use viewport height
                : 200; // Default: 200px maxHeight
        },

        displayedPlaceholder() {
            if (this.multiple && this.selectedValues?.length) {
                if (this.selectedValues.length === this.options.length) return 'All options selected'
                if (this.selectedValues.length > 1) return `${this.selectedValues.length} options selected`
                return this.options.find((o) => o.value === this.selectedValues[0])?.text
            }
            if (this.selectedValues.length) return this.options.find((o) => o.value === this.selectedValues[0])?.text
            return this.placeholder
        }
    },

    watch: {
        value: {
            immediate: true,
            handler(newValue) {
                this.setInitialSelected(newValue);
            },
        },
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
        }
    },

    beforeDestroy() {
        this.cleanupPositioning();
        document.removeEventListener('mousedown', this.handleClickOutside); // Cleanup listener
    },
};
</script>

<!-- todo might not need to be scoped -->
<style scoped>
.select-container {
    font-size: 16px; /* reset to base font sizes. */
    position: relative;
}

.select-input-container {
    align-items: center;
    border: 1px solid #ccc;
    border-radius: 8px;
    box-sizing: border-box;
    display: flex;
    height: 40px;
    overflow: hidden;
    width: 100%;
}

.select-input-container:focus-within {
    outline: 1px solid;
}

.select-input-container--disabled {
    background: #eee;
    cursor: not-allowed;
    pointer-events: none;
}

.select-input-input {
    all: unset;

    box-sizing: border-box;
    display: block;
    height: 100%;
    min-width: 0;
    padding: 0 .5rem;
    width: 100%;
}

.select-input-clear {
    all: unset;

    align-items: center;
    background: transparent;
    box-sizing: border-box;
    cursor: pointer;
    display: flex;
    height: 100%;
    justify-content: center;
    width: 44px;
}
.select-input-clear:hover {
    background: #eee;
}

.select-options-container {
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    color: #000;
    position: absolute;
    transition: all 0.2s ease;
    z-index: 10;
}

.select-options-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.select-options-item {
    background-color: #ccc;
    padding: 0.5rem 1rem;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
}

.select-options-item:hover {
    background-color: #999;
}

.select-options-item[aria-disabled="true"] {
    background-color: #999;
    color: #666;
    pointer-events: none;
    cursor: not-allowed;
}

@media (min-width: 640px) {}

@media (min-width: 1024px) {}
</style>
