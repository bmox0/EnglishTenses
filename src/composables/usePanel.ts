import {readonly, ref, watch} from "vue"

export const PANEL_STORAGE_KEY = "english-tenses:panel"

function savedCollapsed(): boolean {
  try {
    return window.localStorage.getItem(PANEL_STORAGE_KEY) === "collapsed"
  } catch {
    return false
  }
}

const collapsed = ref(savedCollapsed())

watch(collapsed, (value) => {
  try {
    window.localStorage.setItem(PANEL_STORAGE_KEY, value ? "collapsed" : "open")
  } catch {}
})

function togglePanel() {
  collapsed.value = !collapsed.value
}

/** Whether the floating panel is folded down to its tab row, remembered in localStorage. */
export function usePanel() {
  return {collapsed: readonly(collapsed), togglePanel}
}
