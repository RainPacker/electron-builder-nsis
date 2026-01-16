const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

async function runBuild() {
    console.log('Starting to build Electron application installer...');

    try {
        // 读取package.json
        const packageJsonPath = './package.json';
        const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        const productName = packageData.productName;
        const name = packageData.build.appId;
        const version = packageData.version;
        const author = packageData.author ? packageData.author.split(' <')[0] : 'Unknown';
        const copyright = packageData.copyright || '';

        console.log(`Application Name: ${productName}`);
        console.log(`Version: ${version}`);
        console.log(`Publisher: ${author}`);

        // 执行electron-builder构建
        console.log('\nBuilding Electron application...');
        // execSync('npm run build:win32', { stdio: 'inherit' });

        // 等待构建完成
        // await new Promise(resolve => setTimeout(resolve, 5000));

        // 检查构建输出目录
        const distPath = 'dist/win-unpacked';
        if (!fs.existsSync(distPath)) {
            throw new Error(`Error: Build output directory ${distPath} does not exist`);
        }

        console.log('\nCleaning and copying build results to FilesToInstall directory...');

        // 先删除FilesToInstall目录中的所有内容（保留LICENSE文件）
        const filesToInstallDir = 'NSIS_SetupSkin/FilesToInstall';
        
        // 读取目录中的所有文件和子目录
        const allItems = fs.readdirSync(filesToInstallDir);
        
        allItems.forEach(item => {
            const itemPath = path.join(filesToInstallDir, item);
            const stat = fs.statSync(itemPath);
            
            // 如果是LICENSE文件则跳过，否则删除
            if (!item.toLowerCase().includes('license')) {
                if (stat.isDirectory()) {
                    deleteFolderRecursive(itemPath);
                } else {
                    fs.unlinkSync(itemPath);
                }
            }
        });

        // 复制新构建的应用到FilesToInstall目录
        copyFolderRecursiveSync(distPath, filesToInstallDir);

        console.log('\nUpdating NSIS configuration file...');

        // 检查是否有可用的图标文件
        let iconFile = 'logo.ico';
        if (fs.existsSync('resources/icon.ico')) {
            iconFile = 'icon.ico';
        } else if (fs.existsSync('resources/logo.ico')) {
            iconFile = 'logo.ico';
        }

        // 备份原始的nim_setup.nsi文件
        const nsiFilePath = 'NSIS_SetupSkin/SetupScripts/nim/nim_setup.nsi';
        const backupFilePath = 'NSIS_SetupSkin/SetupScripts/nim/nim_setup.nsi.bak';
        fs.copyFileSync(nsiFilePath, backupFilePath);

        // 生成新的nim_setup.nsi文件内容
        const nsiContent = [
            `# ====================== Custom Macro Product Info ==============================`,
            `!define PRODUCT_NAME           		"${productName}"`,
            `!define PRODUCT_PATHNAME 			"${name}"  #Registry key for installation/uninstallation`,
            `!define INSTALL_APPEND_PATH         "${productName}"	  #Name appended to installation path `,
            `!define INSTALL_DEFALT_SETUPPATH    ""       #Default installation path  `,
            `!define EXE_NAME               		"${productName}.exe"`,
            `!define PRODUCT_VERSION        		"${version}.0"`,
            `!define PRODUCT_PUBLISHER      		"${author}"`,
            `!define PRODUCT_LEGAL          		"${copyright}"`,
            `!define INSTALL_OUTPUT_NAME    		"${productName}_Setup_v${version}.exe"`,
            ``,
            `# ====================== Custom Macro Installation Info ==============================`,
            `!define INSTALL_7Z_PATH 	   		"..\\\\app.7z"`,
            `!define INSTALL_7Z_NAME 	   		"app.7z"`,
            `!define INSTALL_RES_PATH       		"skin.zip"`,
            `!define INSTALL_LICENCE_FILENAME    "licence.rtf"`,
            `!define INSTALL_ICO 				"logo.ico"`,
            `!define UNINSTALL_ICO 				"uninst.ico"`,
            ``,
            `#SetCompressor lzma`,
            ``,
            `!include "ui_nim_setup.nsh"`,
            ``,
            `# ==================== NSIS Properties ================================`,
            ``,
            `# Request UAC elevation for Vista and Win7.`,
            `# RequestExecutionLevel none|user|highest|admin`,
            `RequestExecutionLevel admin`,
            ``,
            ``,
            `; Installer name.`,
            `Name "\${PRODUCT_NAME}"`,
            ``,
            `# Installer filename.`,
            ``,
            `OutFile "..\\\\..\\\\Output\\\\\${INSTALL_OUTPUT_NAME}"`,
            ``,
            `;$PROGRAMFILES32\\Netease\\NIM\\`,
            ``,
            `InstallDir "1"`,
            ``,
            `# Installer and uninstaller icons`,
            `Icon              "\${INSTALL_ICO}"`,
            `UninstallIcon     "\${UNINSTALL_ICO}"`
        ].join('\n');

        // 写入新的NSI文件
        fs.writeFileSync(nsiFilePath, nsiContent);

        console.log('NSIS configuration file updated');

        console.log('\nExecuting NSIS compilation to generate final installer...');

        // 运行build-nim-nozip.bat
        const nsisDir = 'NSIS_SetupSkin';
        execSync('build-nim-nozip.bat', { cwd: nsisDir, stdio: 'inherit' });

        console.log('\nInstaller build completed!');
        console.log(`Output location: NSIS_SetupSkin\\Output\\${productName}_Setup_v${version}.exe`);

    } catch (error) {
        console.error('Error during build process:', error.message);
        process.exit(1);
    }
}

// 递归删除文件夹
function deleteFolderRecursive(folderPath) {
    if (fs.existsSync(folderPath)) {
        fs.readdirSync(folderPath).forEach(file => {
            const filePath = path.join(folderPath, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                deleteFolderRecursive(filePath);
            } else {
                fs.unlinkSync(filePath);
            }
        });
        fs.rmdirSync(folderPath);
    }
}

// 递归复制文件夹
function copyFolderRecursiveSync(source, destination) {
    if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
    }

    const items = fs.readdirSync(source);

    items.forEach(item => {
        const sourcePath = path.join(source, item);
        const destPath = path.join(destination, item);
        const stat = fs.statSync(sourcePath);

        if (stat.isDirectory()) {
            copyFolderRecursiveSync(sourcePath, destPath);
        } else {
            fs.copyFileSync(sourcePath, destPath);
        }
    });
}

// 运行构建
runBuild();