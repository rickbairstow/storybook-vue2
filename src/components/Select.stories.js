import Select from './Select.vue';

// Generate dummy options
const options = Array.from({ length: 5 }, (_, i) => ({
    value: i + 1,
    text: `Option ${i + 1}`,
    disabled: Math.random() > 0.9, // Randomly disable options
}))

options.push({ value: 'something', text: 'Some really long option that should cause the input to be extremely long', disabled: false })

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
        clearable: true,
        disabled: false,
        id: 'test',
        hasMoreOptions: false,
        multiple: false,
        placeholder: 'Select an option, or type to search',
        options: options,
        searchable: true,
        wide: false,
        value: 1, // Default v-model value is null
    },
};

const Template = (args, { argTypes }) => ({
    components: { Select },
    props: Object.keys(argTypes), // Dynamically map all args to props
    data() {
        return {
            localValue: args.value, // Local v-model binding
            localOptions: args.options // Local options to let me pass down extra options for load more
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
        addMoreOptions() {
            for(let i = 0; i < 5; i++) {
                this.localOptions.push({
                    value: Math.floor(Math.random() * 1000),
                    text: `New Option ${Math.floor(Math.random() * 1000)}`,
                    disabled: Math.random() > 0.8,
                })
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
            <p>Selected Value: {{ localValue }}</p> <!-- Display selected value -->
        </div>
    `,
});

export const SelectTest = Template.bind({});
