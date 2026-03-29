"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RidesController = void 0;
const common_1 = require("@nestjs/common");
const rides_service_1 = require("./rides.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const start_ride_dto_1 = require("./dto/start-ride.dto");
const end_ride_dto_1 = require("./dto/end-ride.dto");
let RidesController = class RidesController {
    ridesService;
    constructor(ridesService) {
        this.ridesService = ridesService;
    }
    startRide(user, _body) {
        return this.ridesService.startRide(user.userId);
    }
    getActiveRide(user) {
        return this.ridesService.getActiveRide(user.userId);
    }
    getRideById(id, user) {
        return this.ridesService.getRideById(id, user.userId);
    }
    endRide(id, user, _body) {
        return this.ridesService.endRide(id, user.userId);
    }
};
exports.RidesController = RidesController;
__decorate([
    (0, common_1.Post)('start'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, start_ride_dto_1.StartRideDto]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "startRide", null);
__decorate([
    (0, common_1.Get)('active'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "getActiveRide", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "getRideById", null);
__decorate([
    (0, common_1.Post)(':id/end'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, end_ride_dto_1.EndRideDto]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "endRide", null);
exports.RidesController = RidesController = __decorate([
    (0, common_1.Controller)('rides'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [rides_service_1.RidesService])
], RidesController);
//# sourceMappingURL=rides.controller.js.map