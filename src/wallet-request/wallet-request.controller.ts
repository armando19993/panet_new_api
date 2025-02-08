import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, Request, UploadedFiles, Query } from '@nestjs/common';
import { WalletRequestService } from './wallet-request.service';
import { CreateWalletRequestDto } from './dto/create-wallet-request.dto';
import { UpdateWalletRequestDto } from './dto/update-wallet-request.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';


@Controller('wallet-request')
export class WalletRequestController {
  constructor(private readonly walletRequestService: WalletRequestService) { }

  @Post()
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'front_document', maxCount: 1 },
        { name: 'back_document', maxCount: 1 },
        { name: 'selfie_document', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: './uploads',
          filename: (req, file, callback) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            callback(
              null,
              `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`
            );
          },
        }),
      }
    )
  )
  async create(
    @Body() createWalletRequestDto,
    @Request() req,
    @UploadedFiles() files: { 
      front_document?: Express.Multer.File[],
      back_document?: Express.Multer.File[],
      selfie_document?: Express.Multer.File[]
    }
  ) {
    const documentPaths = {
      front_document: files.front_document?.[0]?.filename,
      back_document: files.back_document?.[0]?.filename,
      selfie_document: files.selfie_document?.[0]?.filename,
    };

    return this.walletRequestService.create(createWalletRequestDto, req.user, documentPaths);
  }

  @Get()
  findAll(@Query() query) {
    return this.walletRequestService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.walletRequestService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWalletRequestDto: UpdateWalletRequestDto) {
    return this.walletRequestService.update(id, updateWalletRequestDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.walletRequestService.remove(+id);
  }
}
