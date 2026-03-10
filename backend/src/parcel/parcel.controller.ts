import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateParcelRequestDto } from './dto/create-parcel-request.dto';
import { CreateParcelTripDto } from './dto/create-parcel-trip.dto';
import { ListParcelRequestsDto } from './dto/list-parcel-requests.dto';
import { ListParcelTripsDto } from './dto/list-parcel-trips.dto';
import { UpdateParcelTripDto } from './dto/update-parcel-trip.dto';
import { ParcelService } from './parcel.service';

type AuthenticatedRequest = {
  user: {
    id: string;
    phoneNumber: string;
    isAdmin?: boolean;
  };
};

@UseGuards(AuthGuard('jwt'))
@Controller('parcel')
export class ParcelController {
  constructor(private readonly parcelService: ParcelService) {}

  @Post('trips')
  createTrip(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateParcelTripDto,
  ) {
    return this.parcelService.createTrip(req.user.id, dto);
  }

  @Get('trips')
  listTrips(@Query() query: ListParcelTripsDto) {
    return this.parcelService.listTrips(query);
  }

  @Get('trips/mine')
  listMyTrips(@Req() req: AuthenticatedRequest) {
    return this.parcelService.listMyTrips(req.user.id);
  }

  @Patch('trips/:id')
  updateTrip(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateParcelTripDto,
  ) {
    return this.parcelService.updateTrip(req.user.id, id, dto);
  }

  @Post('trips/:id/cancel')
  cancelTrip(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.parcelService.cancelTrip(req.user.id, id);
  }

  @Post('trips/:id/complete')
  completeTrip(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.parcelService.completeTrip(req.user.id, id);
  }

  @Post('requests')
  createRequest(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateParcelRequestDto,
  ) {
    return this.parcelService.createRequest(req.user.id, dto);
  }

  @Get('requests')
  listRequests(@Query() query: ListParcelRequestsDto) {
    return this.parcelService.listRequests(query);
  }

  @Get('requests/mine')
  listMyRequests(@Req() req: AuthenticatedRequest) {
    return this.parcelService.listMyRequests(req.user.id);
  }

  @Post('requests/:id/cancel')
  cancelRequest(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.parcelService.cancelRequest(req.user.id, id);
  }

  @Post('requests/:id/complete')
  completeRequest(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.parcelService.completeRequest(req.user.id, id);
  }

  @Post('requests/:id/match')
  requestMatch(
    @Req() req: AuthenticatedRequest,
    @Param('id') requestId: string,
    @Body('tripId') tripId: string,
  ) {
    return this.parcelService.requestMatch(req.user.id, requestId, tripId);
  }

  @Post('requests/:id/accept')
  acceptMatch(
    @Req() req: AuthenticatedRequest,
    @Param('id') requestId: string,
  ) {
    return this.parcelService.acceptMatch(req.user.id, requestId);
  }

  @Post('requests/:id/reject')
  rejectMatch(
    @Req() req: AuthenticatedRequest,
    @Param('id') requestId: string,
  ) {
    return this.parcelService.rejectMatch(req.user.id, requestId);
  }

  @Get('requests/:id/matches')
  searchTripsForRequest(@Param('id') requestId: string) {
    return this.parcelService.searchTripsForRequest(requestId);
  }

  @Get('trips/:id/matches')
  searchRequestsForTrip(@Param('id') tripId: string) {
    return this.parcelService.searchRequestsForTrip(tripId);
  }
}
