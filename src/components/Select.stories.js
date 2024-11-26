import Select from './Select.vue';

// Storybook settings and dummy data.
const disabledModifier = 0.8
const moreOptionsDelay = 2000
const flatOptions = Array.from({ length: 5 }, (_, i) => ({
    value: i + 1,
    text: `Option ${i + 1}`,
    disabled: Math.random() > disabledModifier
}))
const groupedOptions = [
    {
        group: 'Group 1',
        options: Array.from({ length: 5 }, (_, i) => ({
            value: `group_1_option_${i + 1}`,
            text: `Option ${i + 1}`,
            disabled: Math.random() > disabledModifier
        }))
    },
    {
        group: 'Group 2',
        options: Array.from({ length: 5 }, (_, i) => ({
            value: `group_2_option_${i + 1}`,
            text: `Option ${i + 6}`,
            disabled: Math.random() > disabledModifier
        }))
    }
]

export default {
    components: { Select },
    title: 'Select',
    component: Select,

    argTypes: {
        clearable: {
            description: 'A boolean that allows clearing of the selected value(s).',
            control: {
                type: 'boolean'
            }
        },
        disabled: {
            description: 'A boolean to disable the component, this will also disable the search input if enabled.',
            control: {
                type: 'boolean'
            }
        },
        hasMoreOptions: {
            description: 'A boolean to inform the component that more options can be loaded. This will show the "Load more" button, and emit a "loadMoreOptions" event when clicked. The parent should set this to false when no more options are available.',
            control: {
                type: 'boolean'
            }
        },
        options: {
            description: `An object containing options, this must be of the format [{ text: 'string', value: 'string', disabled: 'boolean' (optional) }]`,
            control: {
                type: 'object'
            }
        },
        multiple: {
            description: 'A boolean to set the component to allow multiple selections, similar to a native HTML select.',
            control: {
                type: 'boolean'
            }
        },
        placeholder: {
            description: 'A string to set the placeholder text for the component. If options are selected then this placeholder is overridden to contain the selected feedback.',
            control: {
                type: 'text'
            }
        },
        searchable: {
            description: 'A boolean to set the component to be searchable, this will enable a search input on the component.',
            control: {
                type: 'boolean'
            }
        },
        wide: {
            description: 'A boolean to set the component to 100% width.',
            control: {
                type: 'boolean'
            }
        },


        // SB doesn't provide dynamic controls in v6, setting to object allows us to manually set a string, number, or array.
        value: { control: { type: 'object' } },

        // Events
        loadMoreOptions: {
            description: 'An emit event, that is triggered when the component requests more options to be loaded. This needs to be handled in the parent, updating the existing options to append additional options.',
            control: {
                type: 'disabled'
            }
        },
    },
    args: {
        clearable: false,
        disabled: false,
        id: 'single-select',
        hasMoreOptions: false,
        multiple: false,
        placeholder: 'Select an option',
        options: flatOptions,
        searchable: true,
        wide: false,

        // Note the value controls the initial value, Storybook v6 isn't capable of keeping this up-to-date.
        value: 1
    }
}

// Setup template
const Template = (args, { argTypes }) => ({
    components: { Select },

    props: Object.keys(argTypes),

    data() {
        return {
            localValue: args.value, // Local v-model binding
            localOptions: args.options, // Local options for load more
        };
    },

    watch: {
        localValue(newValue) {
            this.$emit('update:value', newValue)
        },
    },

    methods: {
        updateValue(newValue) {
            this.localValue = newValue
        },

        async addMoreOptions() {
            // Simulate a delay when loading more options
            await new Promise(resolve => setTimeout(resolve, moreOptionsDelay))

            if (args.options?.[0]?.group) {
                // Add grouped options
                this.localOptions.push({
                    group: `Group ${Math.floor(Math.random() * 1000)}`,
                    options: Array.from({ length: 5 }, (_, i) => ({
                        value: `group_option_${Math.floor(Math.random() * 1000)}`,
                        text: `Option ${i + 1}`,
                        disabled: Math.random() > disabledModifier
                    }))
                })
            } else {
                // Add single options
                for (let i = 0; i < 5; i++) {
                    this.localOptions.push({
                        value: Math.floor(Math.random() * 1000),
                        text: `New Option ${Math.floor(Math.random() * 1000)}`,
                        disabled: Math.random() > 0.8
                    })
                }
            }
        }
    },

    template: `
        <div>
            <Select
                :clearable="$props.clearable"
                :disabled="$props.disabled"
                :id="$props.id"
                :has-more-options="$props.hasMoreOptions"
                :multiple="$props.multiple"
                :placeholder="$props.placeholder"
                :searchable="$props.searchable"
                :wide="$props.wide"
                :value="localValue"
                :options="localOptions"
                @input="updateValue"
                @load-more-options="addMoreOptions()"
            />
            <p>Selected Value: {{ localValue }}</p>
        </div>
    `
})

// Setup stories
export const SelectDefault = Template.bind({})

export const SelectGrouped = Template.bind({})
SelectGrouped.args = Object.assign({}, SelectDefault.args, {
    options: groupedOptions,
    value: 'group_1_option_1'
})

export const MultipleSelect = Template.bind({})
MultipleSelect.args = Object.assign({}, SelectDefault.args, {
    multiple: true,
    placeholder: 'Select multiple options',
    value: [1, 2]
})

export const MultipleSelectGrouped = Template.bind({})
MultipleSelectGrouped.args = Object.assign({}, SelectGrouped.args, {
    multiple: true,
    placeholder: 'Select multiple options',
    options: groupedOptions,
    value: ['group_1_option_1', 'group_2_option_2'],
})

export const MoreOptionsSelect = Template.bind({})
MoreOptionsSelect.args = Object.assign({}, SelectDefault.args, {
    hasMoreOptions: true,
    value: 1
})

export const MoreOptionsSelectGrouped = Template.bind({})
MoreOptionsSelectGrouped.args = Object.assign({}, SelectGrouped.args, {
    hasMoreOptions: true,
    value: 'group_1_option_1'
})
