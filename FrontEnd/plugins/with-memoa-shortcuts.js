const fs = require('node:fs');
const path = require('node:path');
const {IOSConfig, withInfoPlist, withXcodeProject} = require('expo/config-plugins');

module.exports = function withMemoaShortcuts(config) {
  config = withInfoPlist(config, next => {
    next.modResults.MemoaApiBaseUrl = next.extra?.apiBaseUrl || '';
    return next;
  });
  return withXcodeProject(config, next => {
    const projectName = IOSConfig.XcodeUtils.getProjectName(next.modRequest.projectRoot);
    const target = next.modResults.getFirstTarget().uuid;
    const destination = path.join(next.modRequest.platformProjectRoot, projectName, 'MemoaShortcuts');
    fs.mkdirSync(destination, {recursive: true});
    for (const name of ['ShortcutStore.swift', 'MemoaNotificationIntent.swift', 'MemoaShortcutCapture.swift', 'MemoaShortcutCapture.m']) {
      fs.copyFileSync(path.join(next.modRequest.projectRoot, 'native', 'ios', name), path.join(destination, name));
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: `${projectName}/MemoaShortcuts/${name}`,
        groupName: projectName,
        project: next.modResults,
        targetUuid: target,
      });
    }
    return next;
  });
};
