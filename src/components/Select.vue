<template>
    <div
        class="select-container"
        @keydown.esc="closeOptions"
    >
        <!-- temp button to trigger open -->
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
                    @keydown.enter="setSelected(option)"
                >
                    {{  option.text }}

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
        // options: {
        //     type: [Array, Object],
        //     default: () => {},
        //     validator: (value) => {
        //         return value.every((item) =>
        //             validateObjectKeys(['text', 'value'], item)
        //         )
        //     }
        // },
    },

    data() {
        return {
            isOpen: false,
            position: { x: 0, y: 0 },
            floatingStyles: {}, // Stores computed styles
            initialMaxHeight: '0px', // Ensures no "auto" height initially
            cleanupAutoUpdate: null,
            search: '',

            // Super fake options
            options: Array.from({ length: 100 }, (_, i) => ({
                value: i + 1,
                text: `Option ${i + 1}`,
                disabled: Math.random() > 0.8, // Randomly set disabled to true for ~20% of options
            })),
        };
    },

    computed: {
        filteredOptions() {
            if (!this.search) return this.options;

            const searchTerm = this.search.toLowerCase();

            return this.options.filter((option) => option.text.toLowerCase().includes(searchTerm))
        },

        optionsId() {
            return `${this.id}_options`
        },

        viewportMaxHeight() {
            const smBreakpoint = 640;
            return window.innerWidth < smBreakpoint
                ? window.innerHeight // Mobile: Use viewport height
                : 200; // Default: 200px maxHeight
        },
    },

    methods: {
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
                        offset(1), // gap between input and options list
                        flip(),
                        shift(),
                        size({
                            apply: ({ availableHeight, elements }) => {
                                const maxHeight = Math.min(
                                    availableHeight,
                                    this.viewportMaxHeight
                                );
                                Object.assign(elements.floating.style, {
                                    maxHeight: `${maxHeight}px`,
                                    maxWidth: '100%',
                                    overflowY: 'auto',
                                    width: '100%'
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
                this.cleanupAutoUpdate(); // Stops autoUpdate
                this.cleanupAutoUpdate = null;
            }
        },

        openOptions() {
            if (this.isOpen) return;

            console.log('Opening options')
            this.isOpen = true

            this.initialMaxHeight = `${this.viewportMaxHeight}px`; // Set immediately
            this.initAutoPositioning();
        },

        closeOptions() {
            if (!this.isOpen) return;

            console.log('Closing options')
            this.isOpen = false

            this.cleanupPositioning();
            this.initialMaxHeight = '0px'; // Reset to avoid issues
        },

        // TODO
        isOptionSelected(value) {
            return false;
        },

        //todo
        setSelected(option) {
            if (option.disabled) return;
            console.log('Selected: ', option.value)
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
