import { Body, Delete, JsonController, Post, QueryParam, Req, Res, UseBefore } from "routing-controllers";
import { Response, Request } from "express";
import { StatusCodes } from "http-status-codes";
import { AuthMiddleware } from "../../middlewares/AuthMiddleware";
import { handleErrorResponse, response } from "../../utils";
import imageService from "../../utils/upload";
import { DeleteFileDto } from "../../dto/admin/Common.dto";

@JsonController("/common")
@UseBefore(AuthMiddleware)
export class CommonController {

    @Post("/upload")
    async upload(@Req() req: Request, @Res() res: Response, @QueryParam("folder") folder: string) {
        try {
            const files = (req as any).files;
            if (!files || Object.keys(files).length === 0) {
                return response(res, StatusCodes.BAD_REQUEST, "No files uploaded");
            }

            const folderName = folder || "others";
            const uploadResults: any[] = [];

            // Handle multiple files or single file
            const fileEntries = Object.entries(files);

            for (const [key, fileData] of fileEntries) {
                const processFile = async (file: any) => {
                    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
                    const success = await imageService.fileUpload(file, folderName, fileName);
                    if (success) {
                        uploadResults.push({
                            field: key,
                            originalName: file.name,
                            fileName: fileName,
                            path: `${folderName}/${fileName}`,
                            url: `${req.protocol}://${req.get('host')}/public/${folderName}/${fileName}`
                        });
                    }
                };

                if (Array.isArray(fileData)) {
                    for (const file of fileData) {
                        await processFile(file);
                    }
                } else {
                    await processFile(fileData);
                }
            }

            return response(res, StatusCodes.OK, "Files uploaded successfully", uploadResults);
        } catch (error) {
            console.error("Common upload error:", error);
            return handleErrorResponse(error, res);
        }
    }

    @Delete("/delete")
    async deleteFile(@Res() res: Response, @Body() body: DeleteFileDto) {
        try {
            const { folder, fileName } = body;

            const success = await imageService.deleteImage(folder, fileName);
            if (success) {
                return response(res, StatusCodes.OK, "File deleted successfully");
            } else {
                return response(res, StatusCodes.INTERNAL_SERVER_ERROR, "Failed to delete file");
            }
        } catch (error) {
            console.error("Common delete error:", error);
            return handleErrorResponse(error, res);
        }
    }
}
