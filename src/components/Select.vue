<template>
    <div
        class="select-container"
        @keydown.esc="closeOptions"
    >
        <!-- Temp button to trigger open -->
        <button
            type="button"
            @click="isOpen ? closeOptions() : openOptions()"
        >
            Open
        </button>

        <!-- Search area -->
        <div
            class="select-input-container"
            ref="inputContainer"
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
                @focus="openOptions"
            />
        </div>

        <!-- Options dropdown -->
        <div
            v-show="isOpen"
            class="select-options-container"
            ref="optionsContainer"
            :style="{ ...floatingStyles, maxHeight: initialMaxHeight }"
        >
            <ul
                v-if="filteredOptions.length > 0"
                class="select-options-list"
                role="listbox"
                tabindex="0"
                :id="optionsId"
                aria-description="Use the arrow keys to navigate options, press enter to select the highlighted option"
                aria-label="Options list"
            >
                <li
                    v-for="(option) in filteredOptions"
                    class="select-options-item"
                    :class="{ 'disabled': option.disabled }"
                    role="option"
                    tabindex="-1"
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
        },
        placeholder: {
            type: String,
            default: 'Select an option.',
        },
        value: {
            type: [String, Number, Array],
            default: null,
        },
    },

    data() {
        return {
            isOpen: false,
            position: { x: 0, y: 0 },
            floatingStyles: {}, // Stores computed styles
            initialMaxHeight: '0px', // Ensures no "auto" height initially
            cleanupAutoUpdate: null,
            search: '', // Tracks the user's search input
            selectedValues: [], // Stores currently selected values
        };
    },

    computed: {
        filteredOptions() {
            if (!this.search) return this.options; // If no search term, return all options.

            const searchTerm = this.search.toLowerCase();

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
        setInitialSelected(newValue) {
            const values = Array.isArray(newValue) ? newValue : [newValue];
            this.selectedValues = this.options
                .filter((option) => values.includes(option.value) && !option.disabled)
                .map((option) => option.value);
        },

        isOptionSelected(value) {
            return this.selectedValues.includes(value);
        },

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
                this.closeOptions();
            }

            this.$emit('input', this.multiple ? this.selectedValues : newValue); // Emit updated values
        },

        openOptions() {
            if (this.isOpen) return;
            this.isOpen = true;
            this.initialMaxHeight = `${this.viewportMaxHeight}px`;
            this.initAutoPositioning();
        },

        closeOptions() {
            if (!this.isOpen) return;
            this.isOpen = false;
            this.cleanupPositioning();
            this.search = ''; // Clear search on close
            this.initialMaxHeight = '0px';
        },

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

        cleanupPositioning() {
            if (this.cleanupAutoUpdate) {
                this.cleanupAutoUpdate();
                this.cleanupAutoUpdate = null;
            }
        },
    },

    beforeDestroy() {
        this.cleanupPositioning();
    },
};
</script>

<!-- maybe not scoped? -->
<style scoped>
.select-container {
    position: relative;
}

.select-input-container {
    align-items: center;
    border: 1px solid #ccc;
    border-radius: 8px;
    box-sizing: border-box;
    display: flex;
    height: 40px;
    min-width: 120px; /* todo */
    overflow: hidden; /* todo not sure this is needed */
    width: 100%;
}

.select-input-container:focus-within {
    outline: 1px solid;
}

.select-input-input {
    all: unset; /* Resets all inherited and applied styles */
    box-sizing: border-box; /* Ensures padding and borders are included in width/height */
    display: block; /* Makes input behave like a block element */

    height: 100%;
    min-width: 0;
    padding: 0 .5rem;
    width: 100%;
}

.select-options-container {
    background: #fff;
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
.select-options-item.disabled {
    background-color: #999;
    cursor: not-allowed;
    pointer-events: none;
}

@media (min-width: 640px) {}

@media (min-width: 1024px) {}
</style>
