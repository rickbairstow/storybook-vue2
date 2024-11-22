import Select from './Select.vue';

// Generate dummy options
const options = Array.from({ length: 5 }, (_, i) => ({
    value: i + 1,
    text: `Option ${i + 1}`,
    disabled: Math.random() > 0.9, // Randomly disable options
}))

options.push({ value: 'long_test', text: 'Some really long option that should cause the input to be extremely long', disabled: false })

const groupedOptions = [
    {
        group: 'Group 1',
        options: Array.from({ length: 5 }, (_, i) => ({
            value: `group_1_option_${i + 1}`,
            text: `Option ${i + 1}`,
            disabled: Math.random() > 0.9, // Randomly disable options
        })),
    },
    {
        group: 'Group 2',
        options: Array.from({ length: 5 }, (_, i) => ({
            value: `group_2_option_${i + 1}`,
            text: `Option ${i + 6}`,
            disabled: Math.random() > 0.9, // Randomly disable options
        })),
    },
];

export default {
    components: { Select },
    title: 'Select',
    component: Select,
    argTypes: {
        options: {
            description: `An object containing options, this must be of the format [{ text: 'string', value: 'string', disabled: 'boolean' }]`,
            control: {
                type: 'object'
            }
        },
        value: { control: { type: 'text' } }, // Storybook doesn't have the ability to set dynamic type.
    },
    args: {
        clearable: false,
        disabled: false,
        id: 'single-select',
        hasMoreOptions: false,
        multiple: false,
        placeholder: 'Select an option',
        options: options,
        searchable: true,
        wide: false,
        value: null,
    }
};

// Template for all stories
const Template = (args, { argTypes }) => ({
    components: { Select },
    props: Object.keys(argTypes), // Dynamically map all args to props
    data() {
        return {
            localValue: args.value, // Local v-model binding
            localOptions: args.options, // Local options for load more
        };
    },
    watch: {
        localValue(newValue) {
            this.$emit('update:value', newValue); // Sync localValue to Storybook controls
        },
    },
    methods: {
        updateValue(newValue) {
            this.localValue = newValue; // Update localValue from Select's input
        },

        async addMoreOptions() {
            // Simulate a delay for testing
            await new Promise(resolve => setTimeout(resolve, 2000));

            if (args.options?.[0]?.group) {
                // Add grouped options
                this.localOptions.push({
                    group: `Group ${Math.floor(Math.random() * 1000)}`,
                    options: Array.from({ length: 5 }, (_, i) => ({
                        value: `group_option_${Math.floor(Math.random() * 1000)}`,
                        text: `Option ${i + 1}`,
                        disabled: Math.random() > 0.9,
                    }))
                });
            } else {
                // Add single options
                for (let i = 0; i < 5; i++) {
                    this.localOptions.push({
                        value: Math.floor(Math.random() * 1000),
                        text: `New Option ${Math.floor(Math.random() * 1000)}`,
                        disabled: Math.random() > 0.8,
                    });
                }
            }
        },
    },
    template: `
        <div>
            <Select 
                v-bind="$props" 
                :value="localValue"
                :options="localOptions"
                @input="updateValue"
                @load-more-options="addMoreOptions()"
            />
            <p>Selected Value: {{ localValue }}</p>
        </div>
    `,
});

export const SelectDefault = Template.bind({});

export const MultipleSelect = Template.bind({});
MultipleSelect.args = Object.assign({}, SelectDefault.args, {
    multiple: true,
    placeholder: 'Select multiple options',
});

export const MoreOptionsSelect = Template.bind({});
MoreOptionsSelect.args = Object.assign({}, SelectDefault.args, {
    hasMoreOptions: true
});

export const GroupedSelect = Template.bind({});
GroupedSelect.args = Object.assign({}, SelectDefault.args, {
    options: groupedOptions,
});

export const GroupedMultipleSelect = Template.bind({});
GroupedMultipleSelect.args = Object.assign({}, GroupedSelect.args, {
    multiple: true,
    placeholder: 'Select multiple options',
    options: groupedOptions,
});

export const MoreOptionsGroupedSelect = Template.bind({});
MoreOptionsGroupedSelect.args = Object.assign({}, GroupedSelect.args, {
    hasMoreOptions: true
});
