/// <reference types="astro/client" />

declare module 'markdown-it-task-lists' {
  import type MarkdownIt from 'markdown-it';
  export default function taskLists(md: MarkdownIt, options?: { enabled?: boolean; label?: boolean; labelAfter?: boolean }): void;
}
