import HelloWorld from './HelloWorld.vue'

export default {
    components: {HelloWorld},
    title: 'HelloWorld',
    component: HelloWorld,
    argTypes: {}
}

const Template = (args, { argTypes }) => ({
    props: Object.keys(argTypes),
    components: { HelloWorld },
    template: `<HelloWorld />`,
});

export const Test = Template.bind({});
