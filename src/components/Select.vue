<template>
    <div>
        {{ test }}
    </div>
</template>

<script>
export default {
    props: {
        test: {
            default: 'Fail',
            type: String
        }
    }
}
</script>
