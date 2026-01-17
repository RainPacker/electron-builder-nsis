# ====================== Custom Macro Product Info ==============================
!define PRODUCT_NAME           		"MOM"
!define PRODUCT_PATHNAME 			"com.weifu.momwpc"  #Registry key for installation/uninstallation
!define INSTALL_APPEND_PATH         "MOM"	  #Name appended to installation path 
!define INSTALL_DEFALT_SETUPPATH    ""       #Default installation path  
!define EXE_NAME               		"MOM.exe"
!define PRODUCT_VERSION        		"1.0.8.0"
!define PRODUCT_PUBLISHER      		"yangyang.zhang"
!define PRODUCT_LEGAL          		"©2026, WFIT inc."
!define INSTALL_OUTPUT_NAME    		"MOM_Setup_v1.0.8.exe"

# ====================== Custom Macro Installation Info ==============================
!define INSTALL_7Z_PATH 	   		"..\\app.7z"
!define INSTALL_7Z_NAME 	   		"app.7z"
!define INSTALL_RES_PATH       		"skin.zip"
!define INSTALL_LICENCE_FILENAME    "licence.rtf"
!define INSTALL_ICO 				"logo.ico"
!define UNINSTALL_ICO 				"uninst.ico"

#SetCompressor lzma

!include "ui_nim_setup.nsh"

# ==================== NSIS Properties ================================

# Request UAC elevation for Vista and Win7.
# RequestExecutionLevel none|user|highest|admin
RequestExecutionLevel admin


; Installer name.
Name "${PRODUCT_NAME}"

# Installer filename.

OutFile "..\\..\\Output\\${INSTALL_OUTPUT_NAME}"

;$PROGRAMFILES32\Netease\NIM\

InstallDir "1"

# Installer and uninstaller icons
Icon              "${INSTALL_ICO}"
UninstallIcon     "${UNINSTALL_ICO}"