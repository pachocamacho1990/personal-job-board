import { createFileController } from './files.factory';

const controller = createFileController({
    ownerTable: 'jobs',
    filesTable: 'job_files',
    foreignKey: 'job_id',
    entityLabel: 'Job'
});

export const getJobFiles = controller.getFiles;
export const uploadFile = controller.uploadFile;
export const deleteFile = controller.deleteFile;
export const downloadFile = controller.downloadFile;
