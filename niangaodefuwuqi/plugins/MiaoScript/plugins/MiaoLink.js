"use strict";
/// <reference types="@javatypes/bungee-api" />
/// <reference types="@javatypes/bukkit-api" />
/// <reference types="@javatypes/sponge-api" />
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiaoLink = void 0;
var tslib_1 = require("tslib");
var api_1 = require("@ccms/api");
var container_1 = require("@ccms/container");
var plugin_1 = require("@ccms/plugin");
var fs = require("@ccms/common/dist/fs");
var http_1 = require("@ccms/common/dist/http");
var base64 = require("base64-js");
var Runtime = Java.type('java.lang.Runtime');
var Thread = Java.type('java.lang.Thread');
var defaultConfig = {
    id: 0,
    vkey: ''
};
var MiaoLink = /** @class */ (function (_super) {
    tslib_1.__extends(MiaoLink, _super);
    function MiaoLink() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.config = defaultConfig;
        _this.isWindows = false;
        _this.clientName = 'npc';
        _this.client = '';
        _this.port = 0;
        return _this;
    }
    MiaoLink.prototype.load = function () {
        this.isWindows = process.platform == 'win32' || process.platform.toLowerCase().startsWith('windows');
        if (this.isWindows) {
            this.logger.console('§a当前运行于Windows服务器...');
            this.clientName = "npc.exe";
        }
        else {
            this.logger.console('§a当前运行于Linux服务器...');
        }
    };
    MiaoLink.prototype.bukkitload = function () {
        this.port = org.bukkit.Bukkit.getPort();
    };
    MiaoLink.prototype.spongeload = function () {
        this.logger.console('§4Sponge暂不支持端口映射!');
    };
    MiaoLink.prototype.bungeeload = function () {
        var server = base.getInstance().getProxyServer();
        this.port = server.getConfig().getListeners()[0].getQueryPort();
    };
    MiaoLink.prototype.enable = function () {
        if (!this.config.vkey) {
            return this.logger.console('§4服务器尚未绑定 取消自动映射!');
        }
        this.cmdconnect(this.server.getConsoleSender());
    };
    MiaoLink.prototype.disable = function () {
        this.cmddisconnect(this.server.getConsoleSender());
    };
    MiaoLink.prototype.mlink = function () { };
    MiaoLink.prototype.cmdconnect = function (sender, secret) {
        if (secret) {
            var configStr = String.fromCharCode.apply(String, tslib_1.__spreadArray([], tslib_1.__read(Array.from(base64.toByteArray(secret)))));
            var config = JSON.parse(configStr);
            this.config.id = config.id;
            this.config.vkey = config.vkey;
            this.config.save();
        }
        this.startClient(sender);
    };
    MiaoLink.prototype.cmddisconnect = function (sender) {
        if (!this.npc || !this.npc.isAlive()) {
            return this.logger.sender(sender, '§4客户端尚未运行 跳过关闭流程...');
        }
        this.logger.sender(sender, '§6已发送关闭客户端指令...');
        this.npc.destroy();
    };
    MiaoLink.prototype.tabmlink = function (_sender, _command, _args) {
    };
    MiaoLink.prototype.startClient = function (sender, id, vkey) {
        var _this = this;
        if (id === void 0) { id = this.config.id; }
        if (vkey === void 0) { vkey = this.config.vkey; }
        if (!this.port) {
            return this.logger.sender(sender, '§4服务器端口获取失败 取消自动映射!');
        }
        if (!id || !vkey) {
            return this.logger.sender(sender, '§4服务器尚未配置 取消自动映射!');
        }
        if (this.npc && this.npc.isAlive()) {
            this.npc.destroy();
        }
        this.task.create(function () {
            _this.logger.sender(sender, "\u00A76\u83B7\u53D6\u5230\u670D\u52A1\u5668\u7AEF\u53E3: \u00A73" + _this.port + " \u00A7a\u5F00\u59CB\u6620\u5C04\u7AEF\u53E3!");
            var client = _this.query(id, vkey, _this.port);
            var node = client.node;
            var tunnel = client.tunnel;
            _this.client = fs.concat(__dirname, 'MiaoLink', _this.clientName);
            _this.download(sender);
            try {
                _this.npc = Runtime.getRuntime().exec(_this.client + " -server=" + node.bridge + " -vkey=" + vkey + " -type=tcp");
                _this.logger.sender(sender, "\u00A7a\u670D\u52A1\u5668\u7AEF\u53E3\u6620\u5C04\u6210\u529F! \u00A76\u8BBF\u95EE\u5730\u5740: \u00A73" + node.address + ":" + tunnel.port);
                return _this.logger.console("\u00A74\u5BA2\u6237\u7AEF\u5DF2\u7ED3\u675F\u8FD0\u884C \u9000\u51FA\u4EE3\u7801: " + _this.npc.waitFor() + " \u6620\u5C04\u5173\u95ED!");
            }
            catch (error) {
                _this.logger.sender(sender, "\u00A7c\u670D\u52A1\u5668\u7AEF\u53E3\u6620\u5C04\u5931\u8D25! \u00A74ERROR: " + error);
                console.ex(error);
            }
        }, this).async().later(5).submit();
    };
    MiaoLink.prototype.download = function (sender) {
        try {
            if (!fs.exists(this.client)) {
                this.logger.sender(sender, '§c客户端文件不存在 开始下载客户端...');
                var temp = this.client + '.tmp';
                http_1.default.download("https://static.c5mc.cn/" + this.clientName, temp);
                fs.move(temp, this.client, true);
                if (!this.isWindows) {
                    this.logger.sender(sender, '§a当前处于Linux环境 赋予可执行权限...');
                    Runtime.getRuntime().exec("chmod +x " + this.client);
                }
            }
        }
        catch (error) {
            Thread.sleep(500);
            this.download(sender);
        }
    };
    MiaoLink.prototype.query = function (id, vkey, target) {
        var result = this.post("/client?id=" + id + "&vkey=" + vkey + "&target=" + target);
        if (result.code != 200) {
            throw new Error('§4客户端查询失败: ' + result.msg);
        }
        return result.data;
    };
    MiaoLink.prototype.post = function (path, data) {
        if (data === void 0) { data = {}; }
        return http_1.default.post("https://nps.yumc.pw/api" + path, data);
    };
    tslib_1.__decorate([
        container_1.Autowired(api_1.task.TaskManager),
        tslib_1.__metadata("design:type", api_1.task.TaskManager)
    ], MiaoLink.prototype, "task", void 0);
    tslib_1.__decorate([
        container_1.Autowired(api_1.server.Server),
        tslib_1.__metadata("design:type", api_1.server.Server)
    ], MiaoLink.prototype, "server", void 0);
    tslib_1.__decorate([
        plugin_1.Config(),
        tslib_1.__metadata("design:type", Object)
    ], MiaoLink.prototype, "config", void 0);
    tslib_1.__decorate([
        plugin_1.Cmd({ autoMain: true }),
        tslib_1.__metadata("design:type", Function),
        tslib_1.__metadata("design:paramtypes", []),
        tslib_1.__metadata("design:returntype", void 0)
    ], MiaoLink.prototype, "mlink", null);
    tslib_1.__decorate([
        plugin_1.Tab(),
        tslib_1.__metadata("design:type", Function),
        tslib_1.__metadata("design:paramtypes", [Object, String, Array]),
        tslib_1.__metadata("design:returntype", void 0)
    ], MiaoLink.prototype, "tabmlink", null);
    MiaoLink = tslib_1.__decorate([
        plugin_1.JSPlugin({ name: 'MiaoLink', version: '1.0.2', author: 'MiaoWoo', source: __filename })
    ], MiaoLink);
    return MiaoLink;
}(plugin_1.interfaces.Plugin));
exports.MiaoLink = MiaoLink;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWlhb0xpbmsuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvTWlhb0xpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLCtDQUErQztBQUMvQywrQ0FBK0M7QUFDL0MsK0NBQStDOzs7O0FBRS9DLGlDQUF3QztBQUN4Qyw2Q0FBMkM7QUFDM0MsdUNBQW1GO0FBRW5GLHlDQUEwQztBQUMxQywrQ0FBeUM7QUFFekMsa0NBQW1DO0FBRW5DLElBQU0sT0FBTyxHQUE2QixJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUE7QUFDeEUsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO0FBRTVDLElBQU0sYUFBYSxHQUFHO0lBQ2xCLEVBQUUsRUFBRSxDQUFDO0lBQ0wsSUFBSSxFQUFFLEVBQUU7Q0FDWCxDQUFBO0FBR0Q7SUFBOEIsb0NBQWlCO0lBQS9DO1FBQUEscUVBb0lDO1FBN0hXLFlBQU0sR0FBd0MsYUFBYSxDQUFBO1FBRTNELGVBQVMsR0FBRyxLQUFLLENBQUE7UUFDakIsZ0JBQVUsR0FBVyxLQUFLLENBQUE7UUFDMUIsWUFBTSxHQUFXLEVBQUUsQ0FBQTtRQUNuQixVQUFJLEdBQVcsQ0FBQyxDQUFBOztJQXdINUIsQ0FBQztJQXJIRyx1QkFBSSxHQUFKO1FBQ0ksSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsUUFBUSxJQUFJLE9BQU8sSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNwRyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUU7WUFDaEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtZQUMzQyxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQTtTQUM5QjthQUFNO1lBQ0gsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsb0JBQW9C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