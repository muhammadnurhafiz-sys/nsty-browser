/// <reference types="vite/client" />

import type { NstyApi } from '../preload/index'

declare global {
  interface Window {
    nsty: NstyApi
  }
}
