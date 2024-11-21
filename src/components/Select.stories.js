import Select from './Select.vue';

const options = Array.from({ length: 10 }, (_, i) => ({
    value: i + 1,
    text: `Option ${i + 1}`,
    disabled: Math.random() > 0.8, // Randomly disable options
}))

export default {
    components: { Select },
    title: 'Select',
    component: Select,
    argTypes: {
        options: { control: { type: 'object' } }, // Add control for options
        value: { control: { type: 'text' } }, // Add control for v-model value
    },
    args: {
        disabled: false,
        id: 'test',
        multiple: false,
        placeholder: 'Select an option, or type to search',
        options: options,
        value: null, // Default v-model value
    },
};

const Template = (args, { argTypes }) => ({
    components: { Select },
    props: Object.keys(argTypes), // Dynamically map all args to props
    data() {
        return {
            modelValue: args.value, // Local v-model binding
        };
    },
    template: `
        <div>
            <Select 
                v-bind="$props" 
                v-model="modelValue"
            />
            <p>Selected Value: {{ modelValue }}</p> <!-- Display selected value -->
        </div>
    `,
});

export const SelectTest = Template.bind({});
