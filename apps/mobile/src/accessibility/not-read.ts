/**
 * What keeps an element and everything under it out of the accessibility
 * traversal — for the decoration that is drawn beside a label rather than
 * spoken as part of it.
 *
 * Three words for one thing, because three platforms each know their own.
 * `accessible` alone would not do it: it means `isAccessibilityElement` on iOS
 * but only `focusable` on Android, where TalkBack stays free to stop on a
 * descendant. And neither native word reaches the DOM — react-native-web
 * forwards `aria-hidden` and nothing else — so a web build that said only the
 * other two would read every one of them aloud.
 */
export const NOT_READ = {
  "aria-hidden": true,
  accessibilityElementsHidden: true,
  importantForAccessibility: "no-hide-descendants",
} as const;
