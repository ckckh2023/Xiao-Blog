本文整理在使用 Vue 3 过程中遇到的一些常见问题与解决方案，供后续查阅。

## 1. reactive 解构丢失响应性

使用 `reactive` 创建的对象，对其属性进行解构后会丢失响应性。需要使用 `toRefs` 包装：

```js
import { reactive, toRefs } from 'vue';
const state = reactive({ count: 0 });
const { count } = toRefs(state);
```

## 2. ref 与 reactive 的选择

基本类型使用 `ref`，对象/数组使用 `reactive`。在模板中 `ref` 会自动解包，但在 JS 中需 `.value`。

## 3. watch 监听多个源

```js
watch([refA, refB], ([a, b], [prevA, prevB]) => {
  // ...
});
```

## 4. v-model 多绑定

Vue 3 支持多个 `v-model`，通过 `defineEmits` 与 `update:propName` 实现。

> 提示：组合式 API 中逻辑复用优先使用可组合函数（Composables），命名以 `use` 开头。

## 5. Teleport 组件

需要将子组件渲染到 DOM 树其他位置时，使用 `<Teleport to="body">` 包裹即可，常用于弹窗。
