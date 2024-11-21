import HelloWorld from './HelloWorld.vue'

export default {
    components: { HelloWorld },
    title: 'HelloWorld',
    component: HelloWorld,
    argTypes: {}
}

const Template = (args) => ({
    components: { HelloWorld },
    data() {
        return {
            args
        }
    },
    template: `<HelloWorld v-bind="args"/>`
});

export const Test = Template.bind({});
