import { JsonController, Post, Req, Res, UseBefore } from "routing-controllers";
import { Response, Request } from "express";
import { StatusCodes } from "http-status-codes";
import { AuthMiddleware } from "../../middlewares/AuthMiddleware";
import { handleErrorResponse, response } from "../../utils";
import imageService from "../../utils/upload";
import path from "path";
import fs from "fs";
import * as pdf from 'pdf-parse';

@JsonController("/resumes")
@UseBefore(AuthMiddleware)
export class ResumeController {

    @Post("/parse")
    async parse(@Req() req: Request, @Res() res: Response) {
        try {
            const files = (req as any).files;
            if (!files || !files.file) {
                return response(res, StatusCodes.BAD_REQUEST, "No file uploaded");
            }

            const uploadedFile = files.file;

            if (uploadedFile.mimetype !== "application/pdf") {
                return response(res, StatusCodes.BAD_REQUEST, "Only PDF files are allowed");
            }

            const fileName = `resume_${Date.now()}_${uploadedFile.name}`;
            const fileFolder = "resumes";
            const folderPath = path.join(process.cwd(), "public", fileFolder);

            // Ensure directory exists
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }

            // Move file to public/resumes
            await imageService.fileUpload(uploadedFile, fileFolder, fileName);
            const fullPath = path.join(folderPath, fileName);

            // --- STABLE PARSING LOGIC ---
            const dataBuffer = fs.readFileSync(fullPath);
            const pdfData = await (pdf as any)(dataBuffer);

            // This contains the raw text from the resume
            const resumeText = pdfData.text;

            // Clean up: Optional, if you don't want to keep the file
            // fs.unlinkSync(fullPath);

            return response(res, StatusCodes.OK, "Resume text extracted successfully", {
                rawText: resumeText,
                info: pdfData.info, // Metadata like Author, Creator
                file: {
                    fileName: fileName,
                    originalName: uploadedFile.name
                }
            });
        } catch (error) {
            console.error("Resume parse error:", error);
            return handleErrorResponse(error, res);
        }
    }
}