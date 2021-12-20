exports.newOpenStorageModulesOpenStorageClient = function newOpenStorageModulesOpenStorageClient() {
    /*
    This module receives a file to save, and it know which are
    the available storages for the social trading bot currently running.

    So it will pick one of the available and try to save the file there.
    If it does not suceed, it will try at the other available storage until
    it suceeds. 

    Once the file could be saved, it will return the id of the Storage Conatainer
    where the file is localted. 
    */
    let thisObject = {
        persit: persit,
        loadFile: loadFile,
        initialize: initialize,
        finalize: finalize
    }
    let availableStorage
    let web3
    let saveIntervalId
    let recordsToSave
    let saveOneFileCanRun

    return thisObject

    function finalize() {
        availableStorage = undefined
        web3 = undefined
        clearInterval(saveIntervalId)
    }

    async function initialize() {
        recordsToSave = []
        saveOneFileCanRun = true
        web3 = new SA.nodeModules.web3()
        availableStorage = TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.socialTradingBotReference.referenceParent.availableStorage

        saveIntervalId = setInterval(saveOneFile, 1000)
    }

    function persit(record) {
        recordsToSave.push(record)
    }

    async function loadFile(fileKey) {
        /*
        We are going to load this file from the Storage Containers defined.
        We are going to try to read it first from the first Storage container
        and if it is not possible we will try with the next ones.
        */
        let fileName = fileKey.fileName
        let filePath = SA.projects.foundations.utilities.filesAndDirectories.pathFromDatetime(fileKey.timestamp)
        let password = fileKey.password

        let fileContent
        for (let i = 0; i < availableStorage.storageContainerReferences.length; i++) {
            let storageContainerReference = availableStorage.storageContainerReferences[i]
            if (storageContainerReference.referenceParent === undefined) { continue }
            if (storageContainerReference.referenceParent.parentNode === undefined) { continue }

            let storageContainer = storageContainerReference.referenceParent

            switch (storageContainer.parentNode.type) {
                case 'Github Storage': {
                    let encryptedFileContent = await SA.projects.openStorage.utilities.githubStorage.loadFile(fileName, filePath, storageContainer)
                    fileContent = SA.projects.foundations.utilities.encryption.decrypt(encryptedFileContent, password)
                    break
                }
                case 'Superalgos Storage': {
                    // TODO Build the Superalgos Storage Provider
                    break
                }
            }
        }
        return fileContent
    }

    async function saveOneFile() {

        if (recordsToSave.length === 0) { return }
        if (saveOneFileCanRun === false) { return }

        saveOneFileCanRun = false

        let timestamp = (new Date()).valueOf()
        let file = {
            timestamp: timestamp,
            content: recordsToSave
        }

        let fileContent = JSON.stringify(file)
        let password = SA.projects.foundations.utilities.encryption.randomPassword()
        let encryptedFileContent = SA.projects.foundations.utilities.encryption.encrypt(fileContent, password)
        let fileName = web3.eth.accounts.hashMessage(encryptedFileContent)
        let filePath = SA.projects.foundations.utilities.filesAndDirectories.pathFromDatetime(timestamp)
        /*
        We are going to save this file at all of the Storage Containers defined.
        */
        for (let i = 0; i < availableStorage.storageContainerReferences.length; i++) {
            let storageContainerReference = availableStorage.storageContainerReferences[i]
            if (storageContainerReference.referenceParent === undefined) { continue }
            if (storageContainerReference.referenceParent.parentNode === undefined) { continue }

            let storageContainer = storageContainerReference.referenceParent

            switch (storageContainer.parentNode.type) {
                case 'Github Storage': {
                    await SA.projects.openStorage.utilities.githubStorage.saveFile(fileName, filePath, encryptedFileContent, storageContainer)
                        .then(onFileSaved)
                        .catch(onFileNodeSaved)
                    break
                }
                case 'Superalgos Storage': {
                    // TODO Build the Superalgos Storage Provider
                    break
                }
            }

            function onFileSaved() {

                recordsToSave = []

                let fileKey = {
                    timestamp: timestamp,
                    fileName: fileName,
                    storageContainerId: storageContainer.id,
                    password: password
                }
                await TS.projects.foundations.globals.taskConstants.P2P_NETWORK.p2pNetworkStart.sendMessage(fileKey)
            }

            function onFileNodeSaved() {
                /*
                The content then will be saved at the next run of this function.
                */
            }
        }

        saveOneFileCanRun = true
    }
}