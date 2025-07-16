import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { LoginDto } from "./dto/login.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post("login")
  login(@Body() req: LoginDto) {
    return this.authService.login(req);
  }

  @Get("profile")
  @UseGuards(AuthGuard)
  profile(@Request() req) {
    return this.authService.getProfile(req.user.id)
  }

  @Get("send-otp")
  sendOtp(@Query("") query) {
    const { user, otp } = query
    return this.authService.sendOtp(user, otp)
  }

  @Get('pantalla/solucion/error/jesus')
  async responseUpdate() {
    return this.authService.responseUpdate()
  }

  @Post('update/pin/panet-pay')
  updatePinPanetPay(@Body() data: any) {
    return this.authService.updatePinPanetPay(data)
  }

  @Post('update/status/panet-pay')
  updateStatusPanetPay(@Body() data: any) {
    return this.authService.updateStatusPanetPay(data)
  }
}
