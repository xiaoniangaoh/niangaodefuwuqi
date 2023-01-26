"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiaoReward = void 0;
var tslib_1 = require("tslib");
var api_1 = require("@ccms/api");
var plugin_1 = require("@ccms/plugin");
var qrcode_1 = require("@ccms/common/dist/qrcode");
var container_1 = require("@ccms/container");
var http_1 = require("@ccms/common/dist/http");
var BufferedImage = Java.type('java.awt.image.BufferedImage');
var Color = Java.type('java.awt.Color');
var Bytes = Java.type('byte[]');
var createPacketAdapterFunction = eval("\nfunction(cls, plugin, type, onPacketSending){\n    return new cls(plugin, type) {\n        onPacketSending: onPacketSending\n    }\n}");
var defaultConfig = {
    prefix: '§6[§b广告系统§6]§r',
    serverId: '',
    serverToken: '',
    drawCommand: 'points give %player_name% %amount%',
    coinName: '点券',
    joinTip: true
};
var MiaoReward = /** @class */ (function (_super) {
    tslib_1.__extends(MiaoReward, _super);
    function MiaoReward() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.notifyError = true;
        _this.cacheBindUuid = '';
        _this.zeroMapView = undefined;
        _this.playerImageCache = new Map();
        _this.playerTaskCache = new Map();
        _this.playerInfoCache = new Map();
        _this.downgrade = false;
        _this.subversion = 0;
        _this.config = defaultConfig;
        _this.isBungeeCord = undefined;
        return _this;
    }
    MiaoReward.prototype.load = function () {
        var _this = this;
        this.config.prefix = this.config.prefix || '§6[§b广告系统§6]§r';
        this.config.drawCommand = this.config.drawCommand || 'p give %player_name% %amount%';
        if (this.config.coinName == undefined) {
            this.config.coinName = '点券';
            this.config.save();
        }
        if (this.config.joinTip == undefined) {
            this.config.joinTip = true;
            this.config.save();
        }
        //@ts-ignore
        this.logger.prefix = this.config.prefix;
        this.downgrade = this.Bukkit.server.class.name.split('.')[3] == "v1_7_R4";
        this.subversion = parseInt(this.Bukkit.server.class.name.split('.')[3].split('_')[1]);
        this.updateServerInfo(null, function () { return _this.updateOnlinePlayersInfo(); });
    };
    MiaoReward.prototype.updateServerInfo = function (player, cb) {
        var _this = this;
        this.taskManager.create(function () {
            if (_this.config.serverId) {
                var result = _this.httpPost("https://reward.yumc.pw/server/server", {
                    id: _this.config.serverId,
                    token: _this.config.serverToken
                });
                if (result.code == 200) {
                    _this.serverInfo = result.data;
                    if (player)
                        _this.bungee.for(player).forward("ALL", "MiaoReward", { type: "updateServerInfo", data: result.data }).send();
                    cb === null || cb === void 0 ? void 0 : cb();
                }
            }
        }).async().submit();
    };
    MiaoReward.prototype.updateOnlinePlayersInfo = function () {
        var _this = this;
        Java.from(this.server.getOnlinePlayers()).forEach(function (player) { return _this.updatePlayerInfo(player); });
    };
    MiaoReward.prototype.updatePlayerInfo = function (player) {
        var _this = this;
        this.taskManager.create(function () { return _this.queryUser(player); }).async().submit();
    };
    MiaoReward.prototype.enable = function () {
        this.initPlaceholderAPI();
        this.initBungeeCord();
        this.initZeroMap();
    };
    MiaoReward.prototype.initBungeeCord = function () {
        var _this = this;
        var _a;
        this.channelOff = (_a = this.channel) === null || _a === void 0 ? void 0 : _a.listen(this, 'BungeeCord', function (data) {
            if (!_this.isBungeeCord) {
                _this.isBungeeCord = true;
            }
            var input = _this.ByteStreams.newDataInput(data);
            var subChannel = input.readUTF();
            switch (subChannel) {
                case "GetServer":
                    _this.isBungeeCord = true;
                    var serverName = input.readUTF();
                    break;
                case "MiaoReward":
                    _this.readForward(input);
                    break;
            }
        });
        var players = this.server.getOnlinePlayers();
        if (players.length)
            this.bungeeCordDetect(players[0]);
    };
    MiaoReward.prototype.readForward = function (input) {
        var message = JSON.parse(input.readUTF());
        console.log(message);
        switch (message.type) {
            case "updateServerInfo":
                this.serverInfo = message.data;
                console.console(this.config.prefix, '§6兑换比例已更新为:§a', message.data.ratio);
                break;
        }
    };
    MiaoReward.prototype.initPlaceholderAPI = function () {
        var _this = this;
        if (!this.PlaceholderAPI) {
            console.console("§cCan't found me.clip.placeholderapi.PlaceholderAPI variable will not be replaced!");
        }
        else {
            this.expansion = new this.PlaceholderExpansion({
                getIdentifier: function () { return 'mrd'; },
                persist: function () { return true; },
                getAuthor: function () { return 'MiaoWoo'; },
                getVersion: function () { return '1.0.0'; },
                onPlaceholderRequest: this.onPlaceholderRequest.bind(this)
            });
            this.taskManager.create(function () { return _this.expansion.register(); }).submit();
        }
    };
    MiaoReward.prototype.onPlaceholderRequest = function (player, s) {
        if (!this.playerInfoCache.has(player.getName())) {
            return '数据加载中';
        }
        var data = this.playerInfoCache.get(player.getName());
        if (!data) {
            return '用户未绑定';
        }
        switch (s.toLowerCase()) {
            case "balance": return data.balance;
            case "sign": return data.sign;
            case "video": return data.video;
            case "box": return data.box;
            case "block": return data.block;
            default: return "未知的参数: " + s;
        }
    };
    MiaoReward.prototype.initZeroMap = function () {
        var _this = this;
        this.taskManager.create(function () {
            _this.zeroMapView = _this.Bukkit.getMap(0) || _this.Bukkit.createMap(_this.Bukkit.getWorlds()[0]);
            _this.zeroMapView.setScale(org.bukkit.map.MapView.Scale.FARTHEST);
            _this.zeroMapView.getRenderers().clear();
        }).submit();
        var minecraftVersion = this.ProtocolLibrary.getProtocolManager().getMinecraftVersion();
        this.itemStackArrayLength = minecraftVersion.getMinor() < 9 ? 45 : 46;
        this.initPacketAdapter();
    };
    MiaoReward.prototype.createPacketAdapter = function (onPacketSending) {
        return createPacketAdapterFunction(this.PacketAdapter, base.getInstance(), [this.PacketType.Play.Server.MAP], onPacketSending);
    };
    MiaoReward.prototype.initPacketAdapter = function () {
        if (!this.ProtocolLibrary) {
            return this.logger.console("\u00A74\u670D\u52A1\u5668\u672A\u5B89\u88C5 ProtocolLib \u65E0\u6CD5\u626B\u7801\u529F\u80FD \u8BF7\u5B89\u88C5\u540E\u91CD\u8BD5!");
        }
        var writer = undefined;
        if (this.downgrade) {
            writer = function (packet, bytes) {
                // let xbytes = new Bytes(131)
                var origin = packet.getByteArrays().read(0);
                // xbytes[1] = origin[1]
                // xbytes[2] = origin[2]
                for (var y = 0; y < 128; ++y) {
                    origin[y + 3] = bytes[y * 128 + origin[1]];
                }
                packet.getByteArrays().write(0, origin);
            };
        }
        else if (this.subversion < 17) {
            writer = function (packet, bytes) {
                packet.getByteArrays().write(0, bytes);
                packet.getIntegers().write(3, 128);
                packet.getIntegers().write(4, 128);
            };
        }
        else if (this.subversion > 16) {
            writer = function (packet, bytes) {
                var b = packet.getModifier().read(4);
                if (b) {
                    var bi = Java.type(b.class.name);
                    packet.getModifier().write(4, new bi(b.a, b.b, 128, 128, bytes));
                }
            };
        }
        if (writer) {
            this.adapter = this.createPacketAdapter(this.getPacketAdapter(writer));
            this.ProtocolLibrary.getProtocolManager().addPacketListener(this.adapter);
        }
        else {
            console.console('§4当前服务器不支持虚拟地图发包 将无法使用扫码功能!');
        }
    };
    MiaoReward.prototype.getPacketAdapter = function (writer) {
        var _this = this;
        return function (event) {
            var integers = event.getPacket().getIntegers().getValues();
            var mapId = integers.get(0);
            var player = event.getPlayer();
            if (mapId == _this.zeroMapView.getId() && _this.playerImageCache.has(player.getName())) {
                writer(event.getPacket(), _this.playerImageCache.get(player.getName()));
            }
        };
    };
    MiaoReward.prototype.sendWindowItems = function (player, mapItem) {
        var protocolManager = this.ProtocolLibrary.getProtocolManager();
        try {
            var ItemStackArray = Java.type('org.bukkit.inventory.ItemStack[]');
            var arritemStack = new ItemStackArray(this.itemStackArrayLength);
            java.util.Arrays.fill(arritemStack, new org.bukkit.inventory.ItemStack(org.bukkit.Material.AIR));
            arritemStack[36 + player.getInventory().getHeldItemSlot()] = mapItem;
            var packetContainer = protocolManager.createPacket(this.PacketType.Play.Server.WINDOW_ITEMS);
            try {
                packetContainer.getItemArrayModifier().write(0, arritemStack);
            }
            catch (error) {
                try {
                    packetContainer.getItemListModifier().write(0, java.util.Arrays.asList(arritemStack));
                }
                catch (error) {
                    if (this.notifyError) {
                        console.console('§4发送虚拟物品包失败 可能是ProtocolLib版本不兼容!');
                        console.ex(error);
                        this.notifyError = false;
                        return;
                    }
                }
            }
            protocolManager.sendServerPacket(player, packetContainer);
        }
        catch (ex) {
            console.ex(ex);
        }
    };
    MiaoReward.prototype.disable = function () {
        var _this = this;
        var _a, _b;
        try {
            (_a = this.expansion) === null || _a === void 0 ? void 0 : _a.unregister();
        }
        catch (error) { }
        this.adapter && this.ProtocolLibrary.getProtocolManager().removePacketListener(this.adapter);
        Java.from(this.server.getOnlinePlayers()).forEach(function (p) { return _this.checkAndClear(p); });
        (_b = this.channelOff) === null || _b === void 0 ? void 0 : _b.off();
    };
    MiaoReward.prototype.mrd = function (sender, command, args) {
        var _this = this;
        var cmd = args[0] || 'help';
        var cmdKey = 'cmd' + cmd;
        if (!this[cmdKey]) {
            console.sender(sender, '§4未知的子命令: §c' + cmd);
            console.sender(sender, "\u00A76\u8BF7\u6267\u884C \u00A7b/".concat(command, " \u00A7ahelp \u00A76\u67E5\u770B\u5E2E\u52A9!"));
            return;
        }
        args.shift();
        this.taskManager.create(function () { return _this[cmdKey].apply(_this, tslib_1.__spreadArray([sender], tslib_1.__read(args), false)); }).async().submit();
    };
    MiaoReward.prototype.scanAuth = function (sender, scanType, scanObj, success, cancel) {
        var _this = this;
        this.logger.sender(sender, '§a正在获取授权二维码...');
        var scan = this.httpPost('https://reward.yumc.pw/auth/scan', tslib_1.__assign(tslib_1.__assign({}, scanObj), { type: scanType }));
        if (scan.code == 200) {
            var sync_1 = { scaned: false };
            this.logger.sender(sender, "\u00A7a\u6388\u6743\u4E8C\u7EF4\u7801\u83B7\u53D6\u6210\u529F \u00A7c\u5982\u5730\u56FE\u65E0\u6CD5\u626B\u63CF \u00A76\u8BF7\u70B9\u51FB\u94FE\u63A5\n\u00A73\u00A7n".concat(scan.data.qrcode));
            this.taskManager.create(function () {
                var result = _this.httpPost('https://reward.yumc.pw/auth/scanCheck', {
                    token: scan.data.token,
                    type: scanType,
                    status: 'noscan'
                });
                sync_1.scaned = true;
                if (result.code == 200 && result.data.status == "scaned") {
                    _this.sendTitle(sender, "§3已扫码", "§a请在手机上确认");
                    var result_1 = _this.httpPost('https://reward.yumc.pw/auth/scanCheck', {
                        token: scan.data.token,
                        type: scanType,
                        status: 'scaned'
                    });
                    if (result_1.code == 200) {
                        if (result_1.data.status == "confirm") {
                            _this.sendTitle(sender, '§3扫码完成');
                            success(scan.data.token, result_1.data.user);
                        }
                        else if (result_1.data.status == "cancel") {
                            _this.sendTitle(sender, '§c已取消授权');
                            cancel === null || cancel === void 0 ? void 0 : cancel();
                        }
                        else if (result_1.data.status == "scaned") {
                            _this.sendTitle(sender, '§c授权操作超时');
                            cancel === null || cancel === void 0 ? void 0 : cancel();
                        }
                        else {
                            _this.sendTitle(sender, "§c未知的结果", result_1.data.status);
                        }
                    }
                    else {
                        _this.sendTitle(sender, "§4扫码异常", result_1.msg);
                    }
                }
                sync_1.scaned = true;
            }).async().submit();
            this.setItemAndTp(sender, scan.data.url, sync_1);
            this.sendTitle(sender, '');
        }
        else {
            this.logger.sender(sender, '§4授权二维码获取失败!');
        }
    };
    MiaoReward.prototype.bindCheck = function (sender) {
        if (!this.ProtocolLibrary) {
            return this.logger.sender(sender, "\u00A74\u670D\u52A1\u5668\u672A\u5B89\u88C5 ProtocolLib \u65E0\u6CD5\u626B\u7801\u529F\u80FD \u8BF7\u5B89\u88C5\u540E\u91CD\u8BD5!");
        }
        var scanning = this.playerTaskCache.has(sender.getName());
        if (scanning) {
            this.logger.sender(sender, "§4当前正在进行扫码 请稍候重试!");
        }
        return scanning;
    };
    MiaoReward.prototype.cmdopen = function (sender) {
        if (this.bindCheck(sender))
            return;
        this.logger.sender(sender, '§a正在获取小程序二维码...');
        var sync = { scaned: false };
        this.setItemAndTp(sender, 'https://m.q.qq.com/a/p/1110360279?s=' + encodeURIComponent("pages/my/index"), sync);
        this.taskManager.create(function () { return sync.scaned = true; }).later(20 * 50).submit();
    };
    MiaoReward.prototype.cmdbind = function (sender, server) {
        if (!sender.getItemInHand) {
            return this.logger.sender(sender, '§c手持物品检测异常 请检查是否在客户端执行命令!');
        }
        if (this.bindCheck(sender))
            return;
        if (server) {
            this.bindServer(sender);
        }
        else {
            this.bindUser(sender);
        }
    };
    MiaoReward.prototype.cmddraw = function (sender, amount) {
        var _this = this;
        if (!sender.getItemInHand) {
            return this.logger.sender(sender, '§c手持物品检测异常 请检查是否在客户端执行命令!');
        }
        if (!this.playerInfoCache.get(sender.getName())) {
            return this.logger.sender(sender, '§c当前用户尚未绑定服务器玩家账号 请先执行 /mrd bind 绑定账号!');
        }
        amount = Number(amount);
        if (!Number.isInteger(amount)) {
            return this.logger.sender(sender, '§4金额必须是数字!');
        }
        if (amount % 100 !== 0) {
            return this.logger.sender(sender, '§4金额必须是100倍数!');
        }
        if (this.bindCheck(sender)) {
            return;
        }
        this.scanAuth(sender, 'draw', {
            title: '兑换授权',
            content: [
                "是否授权 " + this.serverInfo.name + " 兑换喵币",
                "兑换玩家: " + sender.getName(),
                "兑换数量: " + amount,
                "兑换比例: " + this.serverInfo.ratio,
                "预计到帐: " + (amount * this.serverInfo.ratio).toFixed(0),
                "注意: 数据可能更新不及时 请以实际到账金额为准!"
            ].join('\n')
        }, function (token) {
            _this.drawCoin(sender, amount, token);
        });
    };
    MiaoReward.prototype.drawCoin = function (sender, amount, token) {
        var _this = this;
        if (!token)
            return;
        var draw = this.httpPost('https://reward.yumc.pw/server/draw', {
            id: this.config.serverId,
            token: this.config.serverToken,
            uuid: sender.getUniqueId().toString(),
            username: sender.getName(),
            amount: amount,
            userToken: token
        });
        if (draw.code !== 200) {
            return this.sendError(sender, "\u00A74\u5151\u6362\u5F02\u5E38 \u00A76\u670D\u52A1\u5668\u8FD4\u56DE: \u00A7c".concat(draw.msg));
        }
        var drawAmount = draw.data;
        if (!drawAmount) {
            return this.sendError(sender, '§c服务器返回金额 ' + draw.data + ' 可能存在异常');
        }
        this.taskManager.create(function () {
            var command = _this.config.drawCommand.replace('%player_name%', sender.getName()).replace('%amount%', draw.data);
            if (!_this.server.dispatchConsoleCommand(command)) {
                return _this.sendError.apply(_this, tslib_1.__spreadArray(tslib_1.__spreadArray([sender], tslib_1.__read(draw.msg.split('\n').map(function (s) { return s.replace('点券', _this.config.coinName); })), false), ["\u00A76\u6267\u884C\u7ED3\u679C: \u00A74\u5DF2\u6263\u9664 \u00A7c".concat(amount, " \u00A74\u55B5\u5E01"), "\u00A76\u6267\u884C\u547D\u4EE4: \u00A73/".concat(command, " \u00A7c\u53EF\u80FD\u5B58\u5728\u5F02\u5E38")], false));
            }
            _this.logger.sender(sender, draw.msg.split('\n').map(function (s) { return s.replace('点券', _this.config.coinName); }));
            _this.sendBroadcast(sender, "".concat(_this.config.prefix, "\u00A76\u73A9\u5BB6 \u00A7b").concat(sender.getName(), " \u00A76\u6210\u529F\u5C06 \u00A7a").concat(amount, "\u55B5\u5E01 \u00A76\u5151\u6362\u6210 \u00A7c").concat(draw.data).concat(_this.config.coinName, "!"));
            _this.sendBroadcast(sender, "".concat(_this.config.prefix, "\u00A7c/mrd help \u00A7b\u67E5\u770B\u5E7F\u544A\u7CFB\u7EDF\u5E2E\u52A9 \u00A76\u5FEB\u6765\u4E00\u8D77\u770B\u5E7F\u544A\u8D5A").concat(_this.config.coinName, "\u5427!"));
            _this.queryUser(sender);
        }).submit();
    };
    MiaoReward.prototype.sendError = function (sender) {
        var error = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            error[_i - 1] = arguments[_i];
        }
        return this.logger.sender(sender, tslib_1.__spreadArray(tslib_1.__spreadArray([
            "\u00A7c========== ".concat(this.config.prefix, "\u00A74\u5151\u6362\u5F02\u5E38 \u00A7c==========")
        ], tslib_1.__read(error), false), [
            "\u00A76\u5F02\u5E38\u8D26\u53F7: \u00A7b".concat(sender.getName()),
            "\u00A76\u5F02\u5E38\u65F6\u95F4: \u00A7a".concat(new Date().toLocaleDateString(), " ").concat(new Date().toLocaleTimeString()),
            "\u00A7c\u5982\u679C\u55B5\u5E01\u88AB\u6263\u9664\u4E14\u672A\u5F97\u5230\u5956\u52B1 \u8BF7\u622A\u56FE\u53D1\u5F80QQ\u7FA4!",
            "\u00A7c========== ".concat(this.config.prefix, "\u00A74\u5151\u6362\u5F02\u5E38 \u00A7c=========="),
        ], false));
    };
    MiaoReward.prototype.cmdrank = function (sender, boardcast) {
        var _this = this;
        if (!sender.isOp()) {
            return this.logger.sender(sender, '§4你没有此命令的权限!');
        }
        var result = this.httpPost("https://reward.yumc.pw/server/rank", {
            id: this.config.serverId,
            token: this.config.serverToken
        });
        if (result.code !== 200) {
            return this.logger.sender(sender, "\u00A7c\u4ECA\u65E5\u672A\u67E5\u8BE2\u5230\u6570\u636E!");
        }
        var ranks = tslib_1.__spreadArray(tslib_1.__spreadArray([
            "\u00A76====== ".concat(this.config.prefix, " \u00A7a\u55B5\u5E01\u5151\u6362\u6392\u884C \u00A76======")
        ], tslib_1.__read(result.data.map(function (e, i) { return "\u00A76".concat(i + 1, ". \u00A7a").concat(e.username, " \u00A76\u5151\u6362 \u00A73").concat(e.count, " \u00A76\u6B21 \u00A7c").concat(e.amount, " \u00A76\u55B5\u5E01"); })), false), [
            "\u00A76====== ".concat(this.config.prefix, " \u00A7a\u55B5\u5E01\u5151\u6362\u6392\u884C \u00A76======"),
        ], false);
        if (boardcast) {
            ranks.forEach(function (l) { return _this.sendBroadcast(sender, l); });
        }
        else {
            this.logger.sender(sender, ranks);
        }
    };
    MiaoReward.prototype.cmdserver = function (sender) {
        if (!sender.isOp()) {
            return this.logger.sender(sender, '§4你没有此命令的权限!');
        }
        var result = this.httpPost("https://reward.yumc.pw/server/server", {
            id: this.config.serverId,
            token: this.config.serverToken
        });
        if (result.code !== 200) {
            return this.logger.sender(sender, "\u00A74\u64CD\u4F5C\u5F02\u5E38 \u00A76\u670D\u52A1\u5668\u8FD4\u56DE: \u00A7c".concat(result.msg));
        }
        var data = result.data;
        this.logger.sender(sender, [
            "\u00A76====== ".concat(this.config.prefix, " \u00A7a\u670D\u52A1\u5668\u4FE1\u606F \u00A76======"),
            "\u00A76\u670D\u52A1\u5668: \u00A7a".concat(data.name),
            "\u00A76\u55B5\u5E01\u4F59\u989D: \u00A7b".concat(data.score, " \u00A76\u55B5\u5E01"),
            "\u00A76\u55B5\u5E01\u6BD4\u4F8B: \u00A7b".concat(data.ratio),
            "\u00A76\u4ECA\u65E5\u6536\u5165: \u00A7b".concat(data.today, " \u00A76\u55B5\u5E01"),
            "\u00A76====== ".concat(this.config.prefix, " \u00A7a\u670D\u52A1\u5668\u4FE1\u606F \u00A76======"),
        ]);
    };
    MiaoReward.prototype.cmdratio = function (sender, ratioStr, confirm) {
        var _this = this;
        if (!sender.isOp()) {
            return this.logger.sender(sender, '§4你没有此命令的权限!');
        }
        if (!sender.getItemInHand) {
            return this.logger.sender(sender, '§c手持物品检测异常 请检查是否在客户端执行命令!');
        }
        var _a = tslib_1.__read(this.ratio2string(ratioStr), 3), ratio = _a[0], mbr = _a[1], msg = _a[2];
        if (!confirm) {
            return this.logger.sender(sender, [
                "\u00A74\u8B66\u544A: \u60A8\u6B63\u5728\u8BBE\u7F6E\u670D\u52A1\u5668\u55B5\u5E01/".concat(this.config.coinName, "\u5151\u6362\u6BD4\u4F8B \u8BBE\u7F6E\u540E\u5C06\u5B9E\u65F6\u751F\u6548!"),
                "\u00A76\u60A8\u8BBE\u7F6E\u7684\u5151\u6362\u6BD4\u4F8B\u4E3A " + msg,
                "\u00A76\u73A9\u5BB6\u81F3\u5C11\u9700\u8981 \u00A7a".concat(mbr, "\u55B5\u5E01 \u00A76\u624D\u53EF\u4EE5\u5151\u6362").concat(this.config.coinName, "!"),
                "\u00A76\u8BF7\u6267\u884C \u00A7b/mrd ratio \u00A7c".concat(ratio, " \u00A7econfirm \u00A7c\u786E\u8BA4\u4FEE\u6539!")
            ]);
        }
        if (confirm != 'confirm')
            return this.logger.sender(sender, "\u00A76\u8BF7\u6267\u884C \u00A7b/mrd ratio \u00A7c".concat(ratio, " \u00A7econfirm \u00A7c\u786E\u8BA4\u4FEE\u6539!"));
        this.scanAuth(sender, "ratio", {
            title: "\u662F\u5426\u6388\u6743 ".concat(this.serverInfo.name, " \u8C03\u6574\u5151\u6362\u6BD4\u4F8B"),
            content: [
                "\u64CD\u4F5C\u73A9\u5BB6: ".concat(sender.getName()),
                "\u8C03\u6574\u524D: ".concat(this.serverInfo.ratio),
                "\u8C03\u6574\u540E: ".concat(msg.replace(/§./ig, '')),
                '调整结果实时生效!',
                '跨服端 将自动同步比例!',
                '非跨服端 请重载插件同步比例!'
            ].join('\n')
        }, function (token) {
            var result = _this.httpPost("https://reward.yumc.pw/server/ratio", {
                id: _this.config.serverId,
                token: _this.config.serverToken,
                ratio: ratio,
                userToken: token
            });
            if (result.code !== 200) {
                return _this.logger.sender(sender, "\u00A74\u64CD\u4F5C\u5F02\u5E38 \u00A76\u670D\u52A1\u5668\u8FD4\u56DE: \u00A7c".concat(result.msg));
            }
            _this.logger.sender(sender, "\u00A7a\u64CD\u4F5C\u6210\u529F \u00A76\u670D\u52A1\u5668\u8FD4\u56DE: \u00A7a".concat(result.msg));
            _this.updateServerInfo(sender);
            _this.sendBroadcast(sender, "".concat(_this.config.prefix, " \u00A76\u5F53\u524D\u5151\u6362\u6BD4\u4F8B\u5DF2\u8C03\u6574\u4E3A ") + msg);
        });
    };
    MiaoReward.prototype.cmdreload = function () {
        this.config.reload();
    };
    MiaoReward.prototype.ratio2string = function (ratio) {
        ratio = parseFloat(ratio);
        if (ratio > 1) {
            return [ratio, 1, "\u00A7c".concat(ratio, " \u00A76\u5C31\u662F \u00A7a1\u55B5\u5E01 \u00A76=> \u00A7c").concat(ratio).concat(this.config.coinName, "!")];
        }
        var mbr = Math.round(1 / ratio * 10000) / 10000;
        return [ratio, mbr, "\u00A7c".concat(ratio, " \u00A76\u5C31\u662F \u00A7a").concat(mbr, "\u55B5\u5E01 \u00A76=> \u00A7c1").concat(this.config.coinName, "!")];
    };
    MiaoReward.prototype.sendBroadcast = function (player, message) {
        if (!this.isBungeeCord) {
            return org.bukkit.Bukkit.broadcastMessage(message);
        }
        this.bungee.for(player).broadcast(message).send();
    };
    MiaoReward.prototype.bindServer = function (sender) {
        var _this = this;
        if (!sender.isOp()) {
            return this.logger.sender(sender, '§4您没有配置服务器的权限!');
        }
        this.logger.sender(sender, '§a正在请求二维码 请稍候...');
        var scanObj = http_1.default.get("https://reward.yumc.pw/server/scan");
        if (scanObj.code !== 200) {
            return this.logger.sender(sender, '§c获取服务器绑定码失败! Error: ' + scanObj.msg);
        }
        this.cacheBindUuid = scanObj.data.uuid;
        var sync = { scaned: false };
        this.taskManager.create(function () {
            var check = _this.httpPost("https://reward.yumc.pw/server/check", {
                token: _this.cacheBindUuid,
                sync: true
            });
            if (check.code == 200) {
                _this.config.serverId = check.data.serverId;
                _this.config.serverToken = check.data.serverToken;
                _this.config.save();
                _this.logger.sender(sender, '§a已成功绑定服务器: §b' + check.data.serverName);
                _this.updateServerInfo(sender);
                _this.updateOnlinePlayersInfo();
            }
            sync.scaned = true;
        }).async().submit();
        this.setItemAndTp(sender, scanObj.data.url, sync);
    };
    MiaoReward.prototype.bindUser = function (sender) {
        var _this = this;
        if (!this.serverInfo) {
            return this.logger.sender(sender, '§4当前服务器尚未配置绑定ID 请联系腐竹进行配置!');
        }
        var check = this.httpPost("https://reward.yumc.pw/server/query", {
            id: this.config.serverId,
            token: this.config.serverToken
        });
        if (check.code !== 200) {
            return this.logger.sender(sender, '§4获取绑定参数异常! §cError: ' + check.msg);
        }
        var queryUser = this.queryUser(sender);
        if (queryUser.code == 200) {
            this.logger.sender(sender, ['§a当前用户已绑定! §3如需看广告请扫码进入!']);
            return this.cmdopen(sender);
        }
        this.logger.sender(sender, '§a正在请求二维码 请稍候...');
        var bindUrl = 'https://m.q.qq.com/a/p/1110360279?s=' + encodeURIComponent("pages/my/index?bindType=user&serverId=".concat(this.config.serverId, "&uuid=").concat(sender.getUniqueId().toString(), "&username=").concat(sender.getName()));
        var sync = { scaned: false, timeout: false };
        this.taskManager.create(function () {
            var queryUser = _this.queryUser(sender, true);
            if (queryUser.code == 200) {
                _this.sendResult(sender, '绑定成功', queryUser.data);
                sync.scaned = true;
            }
        }).async().submit();
        this.setItemAndTp(sender, bindUrl, sync);
    };
    MiaoReward.prototype.sendActionBar = function (sender, message) {
        if (!this.downgrade) {
            this.chat.sendActionBar(sender, message);
        }
    };
    MiaoReward.prototype.sendTitle = function (sender, title, subtitle, fadeIn, time, fadeOut) {
        if (subtitle === void 0) { subtitle = ''; }
        if (fadeIn === void 0) { fadeIn = 20; }
        if (time === void 0) { time = 100; }
        if (fadeOut === void 0) { fadeOut = 20; }
        if (!title)
            return;
        if (this.downgrade) {
            this.logger.sender(sender, "".concat(title).concat(subtitle ? " ".concat(subtitle) : ''));
        }
        else {
            this.chat.sendTitle(sender, title, subtitle, fadeIn, time, fadeOut);
        }
    };
    MiaoReward.prototype.clearTitle = function (sender) {
        this.chat.clearTitle(sender);
    };
    MiaoReward.prototype.setItemAndTp = function (sender, content, sync, name, tip) {
        var _this = this;
        if (name === void 0) { name = '手机QQ扫描二维码'; }
        if (tip === void 0) { tip = '手机QQ扫描二维码'; }
        this.taskManager.create(function () {
            if (!sync.left) {
                sync.left = 55;
            }
            sync.cancelled = false;
            var task = _this.taskManager.create(function () {
                try {
                    if (--sync.left < 0 || sync.scaned || !sender.isOnline() || !_this.isHoldQrCodeItem(sender)) {
                        if (sync.left < 0) {
                            _this.logger.sender(sender, '§c二维码已过期 请重新获取 如已扫码请忽略!');
                            task.cancel();
                        }
                        _this.cancelTask(sender);
                        sync.cancelled = true;
                        return;
                    }
                    _this.sendActionBar(sender, "\u00A7c\u00A7l".concat(tip, " \u5269\u4F59 ").concat(sync.left, " \u79D2..."));
                }
                catch (error) {
                    console.ex(error);
                }
            }, _this).async().later(20).timer(20).submit();
            _this.playerTaskCache.set(sender.getName(), task);
            if (_this.downgrade) {
                _this.downgradeTask(sender);
            }
            _this.playerImageCache.set(sender.getName(), org.bukkit.map.MapPalette.imageToBytes(_this.createQrcode(content)));
            if (!_this.downgrade) {
                var temp = sender.getLocation();
                temp.setPitch(90);
                sender.teleport(temp);
            }
            _this.sendWindowItems(sender, _this.createQrCodeMapItem(name));
            sender.sendMap(_this.zeroMapView);
            _this.taskManager.create(function () { return _this.sendWindowItems(sender, _this.createQrCodeMapItem(name)); }).later(20).async().submit();
        }).submit();
    };
    MiaoReward.prototype.downgradeTask = function (sender) {
        this.logger.sender(sender, '§c低版本客户端 二维码渲染中 请等待 3 秒 稍候扫码!');
        var waitTask = this.taskManager.create(function () {
            var temp = sender.getLocation();
            temp.setPitch(-90);
            sender.teleport(temp);
        }, this).later(0).timer(20).submit();
        this.taskManager.create(function () {
            waitTask.cancel();
            var temp = sender.getLocation();
            temp.setPitch(90);
            sender.teleport(temp);
        }).later(80).submit();
    };
    MiaoReward.prototype.queryUser = function (sender, sync) {
        if (sync === void 0) { sync = false; }
        if (!this.serverInfo) {
            return this.logger.sender(sender, '§4当前服务器尚未配置绑定ID 请联系腐竹进行配置!');
        }
        var result = this.httpPost("https://reward.yumc.pw/server/queryUser", {
            id: this.config.serverId,
            token: this.config.serverToken,
            uuid: sender.getUniqueId().toString(),
            username: sender.getName(),
            sync: sync
        });
        this.playerInfoCache.set(sender.getName(), (result === null || result === void 0 ? void 0 : result.code) == 200 ? result.data : null);
        return result;
    };
    MiaoReward.prototype.cmdquery = function (sender) {
        var info = this.queryUser(sender);
        if (info.code !== 200) {
            return this.logger.sender(sender, '§4查询异常! §cError: ' + info.msg);
        }
        this.sendResult(sender, '查询结果', info.data);
    };
    MiaoReward.prototype.sendResult = function (sender, title, data) {
        this.playerInfoCache.set(sender.getName(), data);
        this.logger.sender(sender, [
            "\u00A76====== ".concat(this.config.prefix, " \u00A7a").concat(title, " \u00A76======"),
            "\u00A76\u7528 \u6237 \u540D: \u00A7a".concat(sender.getName()),
            "\u00A76U U I D: \u00A7b".concat(sender.getUniqueId().toString()),
            "\u00A76\u55B5    \u5E01: \u00A7b".concat(data.balance),
            "\u00A76\u7B7E    \u5230: \u00A7b".concat(data.sign),
            "\u00A76\u89C6\u9891\u5E7F\u544A: \u00A7b".concat(data.video),
            "\u00A76\u76D2\u5B50\u5E7F\u544A: \u00A7b".concat(data.box),
            "\u00A76\u79EF\u6728\u5E7F\u544A: \u00A7b".concat(data.block),
            '§6==========================='
        ]);
    };
    MiaoReward.prototype.httpPost = function (url, data) {
        var startTime = Date.now();
        var result = http_1.default.post(url, data);
        console.debug("\n====== HTTP POST ======\nREQUEST URL : ".concat(url, "\nREQUEST DATA: ").concat(JSON.stringify(data), "\nRESPONSE    : ").concat(JSON.stringify(result), "\nCAST TIME   : ").concat(Date.now() - startTime));
        return result;
    };
    MiaoReward.prototype.createQrCodeMapItem = function (name) {
        if (name === void 0) { name = '手机QQ扫描二维码'; }
        var item;
        item = new org.bukkit.inventory.ItemStack(org.bukkit.Material.FILLED_MAP || org.bukkit.Material.MAP);
        var meta = item.getItemMeta();
        if (meta.setMapView) {
            meta.setMapView(this.zeroMapView);
        }
        else if (meta.setMapId) {
            meta.setMapId(this.zeroMapView.getId());
        }
        else {
            item.setDurability(this.zeroMapView.getId());
        }
        meta.setDisplayName("\u00A7c".concat(name));
        meta.setLore(["QRCODE"]);
        item.setItemMeta(meta);
        return item;
    };
    MiaoReward.prototype.createQrcode = function (content) {
        var bufferedImage = new BufferedImage(128, 128, BufferedImage.TYPE_INT_RGB);
        var graphics2D = bufferedImage.getGraphics();
        graphics2D.setPaint(Color.WHITE);
        graphics2D.fillRect(0, 0, bufferedImage.getWidth(), bufferedImage.getHeight());
        var qrcode = this.js2qr(content);
        var startPoint = Math.round((bufferedImage.getWidth() - qrcode.getWidth()) / 2);
        graphics2D.drawImage(qrcode, startPoint, startPoint, null);
        graphics2D.dispose();
        return bufferedImage;
    };
    MiaoReward.prototype.js2qr = function (contents) {
        var qrcode = new qrcode_1.QRCode(14, qrcode_1.QRErrorCorrectLevel.H);
        qrcode.addData(contents);
        qrcode.make();
        var length = qrcode.getModuleCount();
        var image = new BufferedImage(length, length, BufferedImage.TYPE_INT_RGB);
        for (var x = 0; x < length; x++) {
            for (var y = 0; y < length; y++) {
                image.setRGB(x, y, qrcode.isDark(x, y) ? 0xFF000000 : 0xFFFFFFFF);
            }
        }
        return image;
    };
    MiaoReward.prototype.bungeeCordDetect = function (player) {
        if (this.isBungeeCord === undefined && player) {
            this.bungee.for(player).getServer().send();
        }
    };
    MiaoReward.prototype.PlayerJoinEvent = function (event) {
        var _this = this;
        var player = event.getPlayer();
        this.bungeeCordDetect(player);
        this.updatePlayerInfo(player);
        if (this.config.joinTip) {
            this.taskManager.create(function () { return _this.logger.sender(player, "\u00A7a\u672C\u670D\u5DF2\u4F7F\u7528\u55B5\u5F0F\u5956\u52B1 \u00A73\u53EF\u4EE5\u770B\u5E7F\u544A\u8D5A".concat(_this.config.coinName, " \u00A7c/mrd help \u00A7b\u67E5\u770B\u5E2E\u52A9!")); }).later(50).submit();
        }
    };
    MiaoReward.prototype.PlayerDropItemEvent = function (event) {
        if (this.checkAndClear(event.getPlayer())) {
            event.setCancelled(true);
        }
    };
    MiaoReward.prototype.PlayerItemHeldEvent = function (event) {
        this.checkAndClear(event.getPlayer());
    };
    MiaoReward.prototype.PlayerQuitEvent = function (event) {
        this.checkAndClear(event.getPlayer());
    };
    MiaoReward.prototype.cancelTask = function (player) {
        if (!this.playerTaskCache.has(player.getName())) {
            return;
        }
        this.checkAndClear(player);
        this.sendActionBar(player, "");
        player.updateInventory();
        this.playerTaskCache.get(player.getName()).cancel();
        this.playerTaskCache.delete(player.getName());
        this.playerImageCache.delete(player.getName());
    };
    MiaoReward.prototype.isHoldQrCodeItem = function (player) {
        return this.playerImageCache.has(player.getName());
    };
    MiaoReward.prototype.checkAndClear = function (player) {
        if (this.isHoldQrCodeItem(player)) {
            this.playerImageCache.delete(player.getName());
            return true;
        }
        return false;
    };
    MiaoReward.prototype.cmdhelp = function (sender) {
        var help = [
            "\u00A76====== ".concat(this.config.prefix, " \u00A7a\u5E2E\u52A9\u83DC\u5355 \u00A76======"),
            "\u00A76/mrd bind \u00A7a\u7ED1\u5B9A\u5708\u4E91\u76D2\u5B50",
            "\u00A76/mrd open \u00A7a\u6253\u5F00\u5708\u4E91\u76D2\u5B50",
            "\u00A76/mrd query \u00A7a\u67E5\u8BE2\u5F53\u524D\u8D26\u6237",
            "\u00A76/mrd draw \u00A7e<\u5151\u6362\u6570\u91CF> \u00A7a\u5151\u6362".concat(this.config.coinName)
        ];
        if (sender.isOp()) {
            help = help.concat([
                "\u00A7c\u7531\u4E8E\u60A8\u662F\u7BA1\u7406\u5458 \u4EE5\u4E3A\u60A8\u5C55\u793A\u989D\u5916\u547D\u4EE4",
                "\u00A76/mrd bind server \u00A7a\u7ED1\u5B9A\u670D\u52A1\u5668",
                "\u00A76/mrd ratio \u00A7e<\u5151\u6362\u6BD4\u4F8B> \u00A7a\u8BBE\u7F6E\u55B5\u5E01/".concat(this.config.coinName, "\u5151\u6362\u6BD4\u4F8B"),
                "\u00A76/mrd statistic \u00A73\u8FD1\u671F\u6536\u5165\u7EDF\u8BA1",
                "\u00A76/mrd rank <boardcast>(\u662F\u5426\u516C\u544A) \u00A72\u4ECA\u65E5\u5151\u6362\u6392\u884C",
                "\u00A76/mrd server \u00A7c\u5F53\u524D\u670D\u52A1\u5668\u4FE1\u606F",
                "\u00A76\u5151\u6362\u6BD4\u4F8B\u8BBE\u7F6E\u8BF4\u660E: \u00A7b\u9ED8\u8BA4\u6BD4\u4F8B\u4E3A 0.001 \u00A76=> \u00A7a1000\u55B5\u5E01 \u00A76\u5151\u6362 \u00A7c1".concat(this.config.coinName),
                "\u00A7c\u6CE8\u610F \u8BBE\u7F6E\u6BD4\u4F8B\u540E \u73A9\u5BB6\u5151\u6362".concat(this.config.coinName, "\u6570\u91CF\u4E0D\u80FD\u5C11\u4E8E 1").concat(this.config.coinName),
                "\u00A7c\u6BD4\u5982 \u8BBE\u7F6E\u4E860.001 \u90A3\u5C31\u662F \u73A9\u5BB6\u81F3\u5C11 1000\u55B5\u5E01 \u624D\u80FD\u5151\u6362!"
            ]);
        }
        this.logger.sender(sender, help);
    };
    MiaoReward.prototype.tabmrd = function (sender, _command, args) {
        if (args.length === 1)
            return ['help', 'bind', 'show', 'statistic', 'query', 'draw', 'ratio', 'rank', 'server'];
        if (args.length === 2 && args[0] === "bind" && sender.isOp())
            return ['server'];
    };
    tslib_1.__decorate([
        (0, container_1.Autowired)(),
        tslib_1.__metadata("design:type", api_1.chat.Chat)
    ], MiaoReward.prototype, "chat", void 0);
    tslib_1.__decorate([
        (0, container_1.Autowired)(),
        tslib_1.__metadata("design:type", api_1.server.Server)
    ], MiaoReward.prototype, "server", void 0);
    tslib_1.__decorate([
        (0, container_1.Autowired)(),
        tslib_1.__metadata("design:type", api_1.task.TaskManager)
    ], MiaoReward.prototype, "taskManager", void 0);
    tslib_1.__decorate([
        (0, container_1.Autowired)(),
        tslib_1.__metadata("design:type", api_1.channel.Channel)
    ], MiaoReward.prototype, "channel", void 0);
    tslib_1.__decorate([
        (0, container_1.Autowired)(),
        tslib_1.__metadata("design:type", api_1.proxy.BungeeCord)
    ], MiaoReward.prototype, "bungee", void 0);
    tslib_1.__decorate([
        (0, plugin_1.Config)(),
        tslib_1.__metadata("design:type", Object)
    ], MiaoReward.prototype, "config", void 0);
    tslib_1.__decorate([
        (0, container_1.JSClass)('org.bukkit.Bukkit'),
        tslib_1.__metadata("design:type", Object)
    ], MiaoReward.prototype, "Bukkit", void 0);
    tslib_1.__decorate([
        (0, container_1.JSClass)('me.clip.placeholderapi.PlaceholderAPI'),
        tslib_1.__metadata("design:type", Object)
    ], MiaoReward.prototype, "PlaceholderAPI", void 0);
    tslib_1.__decorate([
        (0, container_1.JSClass)('me.clip.placeholderapi.PlaceholderHook'),
        tslib_1.__metadata("design:type", Object)
    ], MiaoReward.prototype, "PlaceholderHook", void 0);
    tslib_1.__decorate([
        (0, container_1.JSClass)('me.clip.placeholderapi.expansion.PlaceholderExpansion'),
        tslib_1.__metadata("design:type", Object)
    ], MiaoReward.prototype, "PlaceholderExpansion", void 0);
    tslib_1.__decorate([
        (0, container_1.JSClass)('com.comphenix.protocol.ProtocolLibrary'),
        tslib_1.__metadata("design:type", Object)
    ], MiaoReward.prototype, "ProtocolLibrary", void 0);
    tslib_1.__decorate([
        (0, container_1.JSClass)('com.comphenix.protocol.PacketType'),
        tslib_1.__metadata("design:type", Object)
    ], MiaoReward.prototype, "PacketType", void 0);
    tslib_1.__decorate([
        (0, container_1.JSClass)('com.comphenix.protocol.events.PacketAdapter'),
        tslib_1.__metadata("design:type", Object)
    ], MiaoReward.prototype, "PacketAdapter", void 0);
    tslib_1.__decorate([
        (0, container_1.JSClass)('com.google.common.io.ByteStreams'),
        tslib_1.__metadata("design:type", Object)
    ], MiaoReward.prototype, "ByteStreams", void 0);
    tslib_1.__decorate([
        (0, plugin_1.Cmd)(),
        tslib_1.__metadata("design:type", Function),
        tslib_1.__metadata("design:paramtypes", [Object, String, Array]),
        tslib_1.__metadata("design:returntype", void 0)
    ], MiaoReward.prototype, "mrd", null);
    tslib_1.__decorate([
        (0, plugin_1.Listener)(),
        tslib_1.__metadata("design:type", Function),
        tslib_1.__metadata("design:paramtypes", [org.bukkit.event.player.PlayerJoinEvent]),
        tslib_1.__metadata("design:returntype", void 0)
    ], MiaoReward.prototype, "PlayerJoinEvent", null);
    tslib_1.__decorate([
        (0, plugin_1.Listener)(),
        tslib_1.__metadata("design:type", Function),
        tslib_1.__metadata("design:paramtypes", [org.bukkit.event.player.PlayerDropItemEvent]),
        tslib_1.__metadata("design:returntype", void 0)
    ], MiaoReward.prototype, "PlayerDropItemEvent", null);
    tslib_1.__decorate([
        (0, plugin_1.Listener)(),
        tslib_1.__metadata("design:type", Function),
        tslib_1.__metadata("design:paramtypes", [org.bukkit.event.player.PlayerItemHeldEvent]),
        tslib_1.__metadata("design:returntype", void 0)
    ], MiaoReward.prototype, "PlayerItemHeldEvent", null);
    tslib_1.__decorate([
        (0, plugin_1.Listener)(),
        tslib_1.__metadata("design:type", Function),
        tslib_1.__metadata("design:paramtypes", [org.bukkit.event.player.PlayerQuitEvent]),
        tslib_1.__metadata("design:returntype", void 0)
    ], MiaoReward.prototype, "PlayerQuitEvent", null);
    tslib_1.__decorate([
        (0, plugin_1.Tab)(),
        tslib_1.__metadata("design:type", Function),
        tslib_1.__metadata("design:paramtypes", [Object, Object, Object]),
        tslib_1.__metadata("design:returntype", void 0)
    ], MiaoReward.prototype, "tabmrd", null);
    MiaoReward = tslib_1.__decorate([
        (0, plugin_1.JSPlugin)({ prefix: 'MRD', version: '1.6.1', author: 'MiaoWoo', servers: [api_1.constants.ServerType.Bukkit], nativeDepends: ['ProtocolLib', 'PlaceholderAPI'], source: __filename })
    ], MiaoReward);
    return MiaoReward;
}(plugin_1.interfaces.Plugin));
exports.MiaoReward = MiaoReward;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWlhb1Jld2FyZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9NaWFvUmV3YXJkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSxpQ0FBeUU7QUFDekUsdUNBQTZGO0FBRTdGLG1EQUFzRTtBQUV0RSw2Q0FBOEQ7QUFDOUQsK0NBQXlDO0FBRXpDLElBQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsOEJBQThCLENBQUMsQ0FBQTtBQUMvRCxJQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUE7QUFDekMsSUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtBQTRDakMsSUFBSSwyQkFBMkIsR0FBRyxJQUFJLENBQUMseUlBS3JDLENBQUMsQ0FBQTtBQUVILElBQU0sYUFBYSxHQUFHO0lBQ2xCLE1BQU0sRUFBRSxnQkFBZ0I7SUFDeEIsUUFBUSxFQUFFLEVBQUU7SUFDWixXQUFXLEVBQUUsRUFBRTtJQUNmLFdBQVcsRUFBRSxvQ0FBb0M7SUFDakQsUUFBUSxFQUFFLElBQUk7SUFDZCxPQUFPLEVBQUUsSUFBSTtDQUNoQixDQUFBO0FBR0Q7SUFBZ0Msc0NBQWlCO0lBQWpEO1FBQUEscUVBNHlCQztRQTF5QlcsaUJBQVcsR0FBRyxJQUFJLENBQUE7UUFDbEIsbUJBQWEsR0FBRyxFQUFFLENBQUE7UUFDbEIsaUJBQVcsR0FBRyxTQUFTLENBQUE7UUFDdkIsc0JBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQWUsQ0FBQTtRQUN6QyxxQkFBZSxHQUFHLElBQUksR0FBRyxFQUEyQixDQUFBO1FBQ3BELHFCQUFlLEdBQUcsSUFBSSxHQUFHLEVBQW9CLENBQUE7UUFFN0MsZUFBUyxHQUFHLEtBQUssQ0FBQTtRQUNqQixnQkFBVSxHQUFHLENBQUMsQ0FBQTtRQWNkLFlBQU0sR0FBd0MsYUFBYSxDQUFBO1FBdUIzRCxrQkFBWSxHQUFHLFNBQVMsQ0FBQTs7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