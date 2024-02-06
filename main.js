const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const uaup = require('uaup-js')
const path = require('path');
const fs = require('fs').promises; // Use promises version of fs
const ftp = require('basic-ftp');
const AdmZip = require('adm-zip');
const { release } = require('os');


async function checkMinecraftInstallation() {
    const minecraftPath = path.join(app.getPath('appData'), '.minecraft');
    const minecraftModsFolder = path.join(minecraftPath, 'mods');

    let result = {
        fabricInstalled: false,
        minecraftInstalled: false,
        modsFolderExists: false,
    };

    // Check for Minecraft installation
    if (await fs.access(minecraftPath).then(() => true).catch(() => false)) {
        result.minecraftInstalled = true;

        // Check for Fabric installation
        const fabricVersions = await fs.readdir(minecraftPath).then((folders) =>
            folders.filter((folder) => folder.startsWith('fabric-loader'))
        );
        result.fabricInstalled = fabricVersions.length > 0;

        // Check for 'mods' folder existence
        result.modsFolderExists = await fs.access(minecraftModsFolder).then(() => true).catch(() => false);
    }

    return result;
}

async function downloadFileFromFTP(ftpLink, localPath) {
    const client = new ftp.Client();

    try {
        await client.access({
            host: '176.57.171.172',
            user: 'gpftp303119811540644668',
            password: 'ISqsni2M',
            port: 32131, // Specify the correct port
            secure: false, // Use false for plain FTP, true for FTPS
        });

        await client.downloadTo(localPath, ftpLink);
    } finally {
        await client.close();
    }
}

async function installMods(mainWindow) {
    const minecraftPath = path.join(app.getPath('appData'), '.minecraft');
    const minecraftModsFolder = path.join(minecraftPath, 'mods');
    const zipFilePath = path.join(minecraftModsFolder, 'mods.zip');

    try {
        mainWindow.webContents.send('installationStatus', 'Downloading Mods...');

        // Download from FTP
        await downloadFileFromFTP('config/mods.zip', zipFilePath);

        mainWindow.webContents.send('installationStatus', 'Extracting Mods...');

        const zip = new AdmZip(zipFilePath);
        const zipEntries = zip.getEntries();

        for (const entry of zipEntries) {
            if (!entry.isDirectory) {
                const entryPath = path.join(minecraftModsFolder, path.basename(entry.entryName));
                await fs.writeFile(entryPath, entry.getData());
            }
        }

        mainWindow.webContents.send('installationStatus', 'Deleting Zip File...');

        // Check if the file exists before trying to delete it
        try {
            // Delete the downloaded zip file
            await fs.unlink(zipFilePath);
        } catch (deleteError) {
            if (deleteError.message.includes('Invalid filename')) {
                console.warn('Artif.Err Invalid filename error during deletion:', deleteError.message);
                // Handle the error without rethrowing it
            } else {
                console.error('Error during deletion:', deleteError);
                // Handle other deletion errors if needed
            }
        }

        mainWindow.webContents.send('installationStatus', 'Installation Complete');
    } catch (error) {
        // Log the error without sending an error message to the renderer process
        console.error('Error during installation:', error);
    }
}


app.on('ready', () => {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 400,
        webPreferences: {
            nodeIntegration: true,
            devTools: false,
            contextIsolation: false,
        },
        frame: false,
        resizable: false,
    });
    
    mainWindow.loadFile('index.html');

    mainWindow.webContents.on('did-finish-load', async () => {
        const result = await checkMinecraftInstallation();
        mainWindow.webContents.send('checkMinecraftResult', result);
    });

    ipcMain.on('installMods', async (event, data) => {
        try {
            await installMods(mainWindow);
            event.reply('installationStatus', 'Installation Complete');
        } catch (error) {
            console.error('Error during installation:', error);
            // Handle the error here if needed
        }
    });

    // Add minimize and exit functionality
    ipcMain.on('minimizeApp', () => {
        if (mainWindow) {
            mainWindow.minimize();
        }
    });

    ipcMain.on('exitApp', () => {
        if (mainWindow) {
            mainWindow.close();
        }
    });
    const defaultStages = {
        Checking: "Checking For Updates!", // When Checking For Updates.
        Found: "Update Found!",  // If an Update is Found.
        NotFound: "No Update Found.", // If an Update is Not Found.
        Downloading: "Downloading Update...", // When Downloading Update.
        Unzipping: "Installing Update...", // When Unzipping the Archive into the Application Directory.
        Cleaning: "Finalizing Update...", // When Removing Temp Directories and Files (ex: update archive and tmp directory).
        Launch: "Launching New Version..." // When Launching the Application.
    };

    const updateOptions = {
        gitRepo: "jabomodsapp", // [Required] Your Repo Name
        gitUsername: "only1smokey",  // [Required] Your GitHub Username.
        appName: "jabo-app", //[Required] The Name of the app archive and the app folder.
        appExecutableName: "jabo-app.exe", //[Required] The Executable of the Application to be Run after updating.
        progressBar: null, // {Default is null} [Optional] If Using Electron with a HTML Progressbar, use that element here, otherwise ignore
        label: null, // {Default is null} [Optional] If Using Electron, this will be the area where we put status updates using InnerHTML
        forceUpdate: false, // {Default is false} [Optional] If the Application should be forced updated.  This will change to true if any errors ocurr while launching.
        stageTitles: defaultStages, // {Default is defaultStages} [Optional] Sets the Status Title for Each Stage
        appPath: path.join(__dirname, '..'), // Path to your application
        devBuild: false, // Whether it's a development build
        versionFile: path.join(__dirname, '..', 'version.json') // Path to the version file
    };
    

    uaup.Update(updateOptions);
});


