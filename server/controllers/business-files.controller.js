const createFileController = require('./files.factory');

const controller = createFileController({
    ownerTable: 'business_entities',
    filesTable: 'business_entity_files',
    foreignKey: 'entity_id',
    entityLabel: 'Business entity'
});

module.exports = {
    getEntityFiles: controller.getFiles,
    uploadFile: controller.uploadFile,
    deleteFile: controller.deleteFile,
    downloadFile: controller.downloadFile
};
