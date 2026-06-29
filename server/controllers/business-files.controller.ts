import { createFileController } from './files.factory';

const controller = createFileController({
    ownerTable: 'business_entities',
    filesTable: 'business_entity_files',
    foreignKey: 'entity_id',
    entityLabel: 'Business entity'
});

export const getEntityFiles = controller.getFiles;
export const uploadFile = controller.uploadFile;
export const deleteFile = controller.deleteFile;
export const downloadFile = controller.downloadFile;
