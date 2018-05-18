'use strict'

import { app, BrowserWindow, ipcMain } from 'electron'
import request from 'request'
import semver from 'semver'
import CONFIG from './config/index'
import log from 'electron-log'
import bus from './bus'
import path from 'path'
import utils from '../lib/utils'
import startProxy from './proxy/index'
/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
let proxyUp = false

utils.ensureExists(app.getPath('userData'))
utils.ensureExists(path.resolve(app.getPath('userData'), 'record'))

ipcMain.on('update-config', (event, data) => {
  Object.assign(CONFIG, data)
  console.log(data)
})

ipcMain.on('start-proxy', (event, data) => {
  if (!proxyUp) {
    console.log('trying to start proxy server')
    startProxy(() => {
      console.log('proxy server is ready')
      mainWindow.webContents.send('proxy-ready')
      proxyUp = true
    })
  }
})

bus.$on('http', data => {
  mainWindow.webContents.send('http', data)
})

const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    height: 563,
    useContentSize: true,
    width: 1000
  })

  mainWindow.loadURL(winURL)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

log.info('App starting...')

ipcMain.on('check-update', () => {
  if (process.env.NODE_ENV !== 'development') {
    log.info('check for update')
    let localVersion = app.getVersion()
    let headers = {'User-Agent': `Pooo ${localVersion}`}
    request.get('http://api.github.com/repos/trim21/pooo/releases/latest', {headers}, (err, res, body) => {
      if (err) {
        log.error(err)
      } else {
        let release = JSON.parse(body)
        let latestVersion = semver.clean(release.tag_name)
        log.info(localVersion, latestVersion)
        if (semver.lt(localVersion, latestVersion)) {
          mainWindow.webContents.send('update-available', release)
        } else {
          mainWindow.webContents.send('update-not-available')
        }
      }
    })
  }
})
