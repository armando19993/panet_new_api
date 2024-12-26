import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { RechargeService } from "./recharge.service";
import { CreateRechargeDto } from "./dto/create-recharge.dto";
import { UpdateRechargeDto } from "./dto/update-recharge.dto";
import { AuthGuard } from "src/auth/auth.guard";
import { FileInterceptor } from "@nestjs/platform-express";

@Controller("recharge")
export class RechargeController {
  constructor(private readonly rechargeService: RechargeService) {}

  @Post()
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('comprobante'))
  create(@Body() createRechargeDto, @Request() req, @UploadedFile() file: Express.Multer.File,) {
    return this.rechargeService.create(createRechargeDto, req.user, file);
  }

  @Get("for-user")
  @UseGuards(AuthGuard)
  findByUser(@Request() req) {
    return this.rechargeService.findByUser(req.user);
  }

  @Get()
  @UseGuards(AuthGuard)
  findAll(@Query() query) {
    return this.rechargeService.findAll(query);
  }

  @Get(":id")
  @UseGuards(AuthGuard)
  findOne(@Param("id") id: string) {
    return this.rechargeService.findOne(id);
  }

  @Patch("update-manual/:id")
  @UseGuards(AuthGuard)
  updateManual(@Param("id") id: string, @Body() updateRechargeDto) {
    return this.rechargeService.updateManual(id, updateRechargeDto);
  }

  @Delete(":id")
  @UseGuards(AuthGuard)
  remove(@Param("id") id: string) {
    return this.rechargeService.remove(+id);
  }

  @Post("update/automatic")
  @UseGuards(AuthGuard)
  updateAutomatic(@Body() data) {
    return this.rechargeService.updateAutomatic(data);
  }
}
