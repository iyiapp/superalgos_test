const path = require('path')
const fs = require('fs')
const process = require('process')
const { exec } = require('child_process')
const https = require('https')
const externalScriptsDir = path.join(process.cwd(), 'Platform', 'WebServer', 'externalScripts')
const env = require('../Environment').newEnvironment()
const externalScriptsURLs = env.EXTERNAL_SCRIPTS
const projectPluginMap = require('../Plugins/project-plugin-map.json')

const errorResp = (e) => {
  console.error(e)
  process.exit()
}

// ** export setup piece by piece for more robust tests **
const installExternalScripts = () => {
  for (let i = 0; i<externalScriptsURLs.length; i++) {
    const url = externalScriptsURLs[i]
    const filename = url.split('/').pop()
    const dest = path.join(externalScriptsDir, filename)
    const res = https.get(url, resp => {
      if (resp.statusCode !== 200) {
        console.error(
          `Error downloading ${url}: HTTP response code ${response.statusCode}.`
          )
        return false
      } else {
        const writeStream = fs.createWriteStream(dest)
        resp.pipe(writeStream)
        writeStream.on('error', () => console.error('Error writing to ' + path.resolve(dest)))
        writeStream.on('finish', () => writeStream.close())
        return 5555
      }
    })    
  }
  return 'External scripts installed'
}

const setUpstreamAndOrigin = async (dir, repo='Superalgos') => {
  console.log('Setting up github upstream and origin...')
  // initialize simpleGit
  const simpleGit = require('simple-git')
  const options = {
      binary: 'git',
      maxConcurrentProcesses: 6,
  }
  
  // main app repo should be the working directory
  if (repo === 'Superalgos') options.baseDir = dir || process.cwd()
  // if repo is not main app repo, assume it is a plugin, in ./Plugins.
  else options.baseDir = path.join(process.cwd(), 'Plugins', dir)
  const git = simpleGit(options)
  
  // Check to see it main repo has been set as upstream
  let remotes = await git.getRemotes(true).catch(errorResp)
  let isUpstreamSet
  let origin
  for (let remote in remotes) {
    if (remotes[remote].name === 'upstream') {
      isUpstreamSet = true
    } else {
      isUpstreamSet = false
      if (remotes[remote].name === 'origin') {
        origin = remotes[remote].refs.fetch
      }
    }
  }

  // If upstream has not been set. Set it now
  if (isUpstreamSet === false) {
    await git.addRemote('upstream', `https://github.com/Superalgos/${repo}`).catch(errorResp)
  }

  let gitUser
  let usesSSH
  // if in main Superalgos repo, set gitUser from origin
  if (repo === 'Superalgos' && origin) {
    if (origin.indexOf('@') === -1) {
      gitUser = origin.split('/')[3]
      useSSH = false
    } else {
      gitUser = origin.split(':')[1].split('/')[0]
      usesSSH = true
    }
  }

  // Check that branches exist
  let branchSumAll = await git.branchLocal().catch(errorResp)
  let masterExists = false
  let developExists = false
  for (let i = 0; i < branchSumAll.all.length; i++) {
    if (branchSumAll.all[i] === 'master') masterExists = true
    else if (branchSumAll.all[i] === 'develop') developExists = true
  }
  if (!masterExists) {
    await git.checkout(['-B', 'master'])
  }
  if (!developExists) {
    await git.checkout(['-B', 'develop'])
  }

  // Check that a branch is checked out, otherwise checkout develop
  branchSumAll = await git.branchLocal().catch(errorResp)
  if (branchSumAll.current === '' || branchSumAll.current === 'master') {
    await git.checkout(['-B', 'develop'])
  }

  if (repo !== 'Superalgos' && origin && gitUser) {
    await git.removeRemote('origin').catch(errorResp)
  }

  if (repo !== 'Superalgos' && gitUser) {
    let orURL
    if (usesSSH) {
      orURL = `git@github.com:${gitUser}/${repo}.git`
    }
    else {
      orURL = `https://github.com/${gitUser}/${repo}.git`
      await git.addRemote('origin', orURL).catch(errorResp)
    }
  }
  console.log('Set upstream and origin for github')
  return 'Set upstream and origin for github'
}

const runSetup = (tfjs=false) => {
  // Install Node_Modules to Main Superalgos Directory

  // install tensorflow if user ran tensorflow setup file
  if (tfjs !== false) {
    console.log('Including tensorflow.js in your setup...')
    nodeModulesDirs = [
      path.join(process.cwd(), 
                "Projects", 
                "TensorFlow", 
                "TS", 
                "Bot-Modules", 
                "Learning-Bot", 
                "Low-Frequency-Learning")
  ]
  }

  let dir = process.cwd()
  let command = 'echo Results of install at ' + dir + ' & npm ci'
  let nodeInstPromise = new Promise(resolve => {
    exec(command,
      {
          cwd: dir
      },
      (error, stdout) => {
        if (error) {
          console.log('')
          console.log('There was an error installing some dependencies error: ')
          console.log('')
          console.log(error)
          process.exit(1)
        }
        console.log('')
        console.log(stdout)
      })
  })
  /*
  Here we will go and clone all the plugins repositories that have not been cloned yet.
  Temporarily commenting this section as source for githubUserName and token in this script are not clear.

  const SETUP_PLUGINS_MODULE = require('./setupPlugins.js')
  SETUP_PLUGINS_MODULE.run(githubUserName, token)
  */

  // Donload external scripts
  console.log('')
  console.log('Setting up your environment …')
  console.log('')
  installExternalScripts()

  // wait until node installation is complete
  nodeInstPromise.then(() => {
    // Initialize and update git repositories
    // Ensure upstream and origin are set for this repo and submodules

    let gitUser
    setUpstreamAndOrigin().then(async () => {
      Object.values(projectPluginMap).forEach(plugin => {
        setUpstreamAndOrigin(plugin.dir, plugin.repo)
      })
    }).catch(errorResp)
  })
  return 'Setup complete'
}

module.exports = {
  runSetup,
  setUpstreamAndOrigin,
  installExternalScripts,
  errorResp
}
