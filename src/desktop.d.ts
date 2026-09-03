export {}

declare global {
  interface Window {
    jingxuDesktop?: {
      copyText(text: string): Promise<void>
      openPublishUrl(url: string): Promise<void>
      showItemInFolder(path: string): Promise<void>
      platform: string
    }
  }
}
