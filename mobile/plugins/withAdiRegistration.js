/**
 * Expo config plugin — copies adi-registration.properties into the Android
 * assets folder so Google Play can verify package name ownership.
 * Only needed once during initial Play Console registration.
 */
const { withDangerousMod } = require('@expo/config-plugins')
const fs = require('fs')
const path = require('path')

module.exports = function withAdiRegistration(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const assetsDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'assets'
      )
      fs.mkdirSync(assetsDir, { recursive: true })
      fs.writeFileSync(
        path.join(assetsDir, 'adi-registration.properties'),
        'CAVXUUK7A2HE2AAAAAAAAAAA'
      )
      return cfg
    },
  ])
}
