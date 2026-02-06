const createFileController = require('./files.factory');

const controller = createFileController({
    ownerTable: 'jobs',
    filesTable: 'job_files',
    foreignKey: 'job_id',
    entityLabel: 'Job'
});

module.exports = {
    getJobFiles: controller.getFiles,
    uploadFile: controller.uploadFile,
    deleteFile: controller.deleteFile,
    downloadFile: controller.downloadFile
};
