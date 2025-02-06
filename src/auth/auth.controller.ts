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

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post("login")
  login(@Body() req) {
    return this.authService.login(req);
  }

  @Get("profile")
  @UseGuards(AuthGuard)
  profile(@Request() req) {
    return req.user;
  }

  @Get("send-otp")
  sendOtp(@Query("") query) {
    const { user, otp } = query
    return this.authService.sendOtp(user, otp)
  }
}
