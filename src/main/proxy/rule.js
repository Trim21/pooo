import CONFIG from '../config/index.js'
import bus from '../bus'
import URI from 'urijs'

const apiHostNames = CONFIG.apiHostNames

module.exports = {
  * beforeSendRequest (requestDetail) {
    const newRequestOptions = requestDetail.requestOptions
    if (CONFIG.frontAgent) {
      newRequestOptions.hostname = CONFIG.frontAgentHost
      newRequestOptions.port = CONFIG.frontAgentPort
      newRequestOptions.path = requestDetail.url
    }
    return requestDetail
  },
  async beforeSendResponse (requestDetail, responseDetail) {
    const uri = URI(requestDetail.url)
    let result = responseDetail
    let type
    let content = result.response.body.toString()
    if (apiHostNames.includes(uri.hostname())) {
      const urlPath = uri.path()

      if (urlPath === '/rest/raid/normal_attack_result.json' || urlPath === '/rest/multiraid/normal_attack_result.json') {
        type = 'attack'
      }
      if (urlPath === '/rest/raid/ability_result.json' || urlPath === '/rest/multiraid/ability_result.json') {
        type = 'skill'
      }
      if (urlPath === '/rest/multiraid/start.json' || urlPath === '/rest/raid/start.json') {
        type = 'join-battle'
      }
      if (urlPath === '/rest/multiraid/summon_result.json' || urlPath === '/rest/raid/summon_result.json') {
        type = 'summon'
      }

      if (urlPath.startsWith('/multiraid/content/index')) {
        type = 'enter-multiraid'
        let s = urlPath.split('/')
        content = {
          id: s[s.length - 1]
        }
      }
      if (type) bus.$emit('http', { type, content })
    }
    return responseDetail
  }
  // * beforeDealHttpsRequest (requestDetail) {
  //   return CONFIG.proxyHttps
  // }
}
