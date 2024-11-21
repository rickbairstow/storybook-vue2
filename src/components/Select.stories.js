import Select from './Select.vue'

export default {
    components: { Select },
    title: 'Select',
    component: Select,
    argTypes: {},
    args: {
        disabled: false,
        id: 'test'
    }
}

const Template = (args) => ({
    components: { Select },
    data() {
        return {
            args
        }
    },
    template: `<Select v-bind="args"/>`,
});

export const SelectTest = Template.bind({});
