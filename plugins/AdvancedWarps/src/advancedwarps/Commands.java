package advancedwarps;

import org.bukkit.Location;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Entity;
import org.bukkit.entity.LivingEntity;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntityDeathEvent;
import org.bukkit.event.entity.EntityTeleportEvent;
import org.bukkit.event.entity.PlayerDeathEvent;
import org.bukkit.event.inventory.InventoryOpenEvent;
import org.bukkit.event.inventory.InventoryType;
import org.bukkit.event.player.PlayerTeleportEvent;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.PlayerInventory;
import org.bukkit.scheduler.BukkitRunnable;

import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.UUID;

public class Commands implements CommandExecutor, Listener {

    @Override
    public boolean onCommand(CommandSender sender, Command cmd, String label, String[] args) {
        if (label.equalsIgnoreCase("aw")) {
            try {
                goCommand(sender, cmd, label, args);
            } catch (ClassCastException exception) {
                sender.sendMessage("§6[传送系统]§r 只有玩家才能使用该指令");
            } catch (IndexOutOfBoundsException exception) {
                sender.sendMessage("§6[传送系统]§r 参数个数错误");
            } catch (NumberFormatException exception) {
                sender.sendMessage("§6[传送系统]§r 参数必须是个整数");
            }
        }
        return true;
    }

    public static HashMap<UUID, ItemStack[]> currents=new HashMap<>();

    public static class EventListener implements Listener{
        @EventHandler
        public void onKill(EntityDeathEvent event){
            LivingEntity entity=event.getEntity();
            Player player=entity.getKiller();
            if(player==null){
                return;
            }
            if(killTask.containsKey(player.getUniqueId())){
                if(entity.getCustomName().contains(killTask.get(player.getUniqueId()))){
                    killTask.remove(player.getUniqueId());
                    player.sendMessage("§6[传送系统]§r 击杀生物任务完成，10秒后自动传回原位置！");
                    new BukkitRunnable(){
                        int counter=0;
                        @Override
                        public void run() {
                            if(++counter>=10){
                                currents.remove(player.getUniqueId());
                                player.performCommand("spawn");
                                player.sendMessage("§6[传送系统]§r 传回原位置！");
                                cancel();
                                return;
                            }
                            player.sendMessage("§6[传送系统]§r 击杀生物任务完成，"+(10-counter)+"秒后自动传回原位置！");
                        }
                    }.runTaskTimer(AdvancedWarps.plugin,0L,20L);
                }
            }
        }

        @EventHandler
        public void onDeath(PlayerDeathEvent event){
            Player player=event.getEntity();
            if(currents.containsKey(player.getUniqueId())){
                player.spigot().respawn();
                player.performCommand("spawn");
                player.getInventory().setContents(currents.get(player.getUniqueId()));
                currents.remove(player.getUniqueId());
            }
        }

        @EventHandler
        public void onTeleport(PlayerTeleportEvent event){
            Player player=event.getPlayer();
            if(currents.containsKey(player.getUniqueId())){
                event.setCancelled(true);
            }
        }

        @EventHandler
        public void onOpen(InventoryOpenEvent event){
            Player player= (Player) event.getPlayer();
            Inventory inv=event.getInventory();
            if(inv.getType()==InventoryType.PLAYER||
                inv.getType()==InventoryType.CHEST||
                inv.getType()==InventoryType.CREATIVE){
                return;
            }
            if(currents.containsKey(player.getUniqueId())){
                event.setCancelled(true);
                player.closeInventory();
            }
        }
    }

    public void goCommand(CommandSender sender, Command cmd, String labe, String[] args) {
        if (args.length == 0) {
            sender.sendMessage("§6[传送系统]§r AdvancedWarps插件指令：");
            sender.sendMessage("§6★§r /aw help - 显示指令帮助信息");
            sender.sendMessage("§6★§r /aw list - 显示所有传送点");
            sender.sendMessage("§6★§r /aw tp <传送点ID> - 传送到传送点");
            sender.sendMessage("§6★§r /aw add <传送点ID> - 在当前位置添加传送点");
            sender.sendMessage("§6★§r /aw setLoc <传送点ID> - 设置传送点的传送位置为当前位置");
            sender.sendMessage("§6★§r /aw setCd <传送点ID> <秒数> - 设置传送点的冷却");
            sender.sendMessage("§6★§r /aw setStay <传送点ID> <秒数> - 设置传送点的传回前摇时间");
            sender.sendMessage("§6★§r /aw setLimit <传送点ID> <次数> - 设置传送点的每日次数限制");
            sender.sendMessage("§6★§r /aw setEntity <传送点ID> <生物名> - 设置传送点的击杀任务");
            return;
        }
        String sub = args[0];
        if (sub.equalsIgnoreCase("help")) {
            sender.sendMessage("§6[传送系统]§r AdvancedWarps插件指令：");
            sender.sendMessage("§6★§r /aw help - 显示指令帮助信息");
            sender.sendMessage("§6★§r /aw list - 显示所有传送点");
            sender.sendMessage("§6★§r /aw tp <传送点ID> - 传送到传送点");
            sender.sendMessage("§6★§r /aw add <传送点ID> - 在当前位置添加传送点");
            sender.sendMessage("§6★§r /aw del <传送点ID> - 删除指定传送点");
            sender.sendMessage("§6★§r /aw setLoc <传送点ID> - 设置传送点的传送位置为当前位置");
            sender.sendMessage("§6★§r /aw setCd <传送点ID> <秒数> - 设置传送点的冷却");
            sender.sendMessage("§6★§r /aw setStay <传送点ID> <秒数> - 设置传送点的传回前摇时间");
            sender.sendMessage("§6★§r /aw setLimit <传送点ID> <次数> - 设置传送点的每日次数限制");
            sender.sendMessage("§6★§r /aw setEntity <传送点ID> <生物名> - 设置传送点的击杀任务");
            return;
        }
        if (sub.equalsIgnoreCase("list")) {
            sender.sendMessage("§6[传送系统]§r 传送点列表： §l"+FileManager.points.keySet());
            return;
        }

        String id=args[1];
        if(sub.equalsIgnoreCase("tp")){
            if(!sender.hasPermission("aw.tp."+id)){
                sender.sendMessage("§6[传送系统]§r 你没有权限！");
                return;
            }
            if (!FileManager.points.containsKey(id)) {
                sender.sendMessage("§6[传送系统]§r 传送点不存在！");
                return;
            }
            goTeleport(id,(Player)sender);
            return;
        }

        if(!sender.isOp()){
            sender.sendMessage("§6[传送系统]§r 你没有权限！");
            return;
        }
        if (sub.equalsIgnoreCase("add")) {
            FileManager.addPoint(id, (Player) sender);
            sender.sendMessage("§6[传送系统]§r 添加新传送点成功，请使用指令配置！");
            return;
        }
        if (sub.equalsIgnoreCase("del")) {
            FileManager.delPoint(id);
            sender.sendMessage("§6[传送系统]§r 删除传送点成功！");
            return;
        }
        if (!FileManager.points.containsKey(id)) {
            sender.sendMessage("§6[传送系统]§r 传送点不存在！");
            return;
        }
        if (sub.equalsIgnoreCase("setLoc")) {
            FileManager.modifyLoc(id, ((Player) sender).getLocation());
            sender.sendMessage("§6[传送系统]§r 设置新传送位置成功。");
            return;
        }
        if (sub.equalsIgnoreCase("setCd")) {
            FileManager.modifyCooldown(id, Integer.valueOf(args[2]));
            sender.sendMessage("§6[传送系统]§r 设置新冷却时间成功。");
            return;
        }
        if (sub.equalsIgnoreCase("setStay")) {
            FileManager.modifyStayTime(id, Integer.valueOf(args[2]));
            sender.sendMessage("§6[传送系统]§r 设置新停留时间成功。");
            return;
        }
        if (sub.equalsIgnoreCase("setLimit")) {
            FileManager.modifyDayLimit(id, Integer.valueOf(args[2]));
            sender.sendMessage("§6[传送系统]§r 设置新每日限制成功。");
            return;
        }
        if (sub.equalsIgnoreCase("setEntity")) {
            FileManager.modifyEntityName(id, args[2]);
            sender.sendMessage("§6[传送系统]§r 设置新击杀目标成功。");
            return;
        }
        if (sub.equalsIgnoreCase("setDate")) {
            FileManager.modifyDate(id, Integer.valueOf(args[2]));
            sender.sendMessage("§6[传送系统]§r 设置新日期成功。");
            return;
        }
    }

    private void goTeleport(String id, Player player) {
        if(currents.containsKey(player.getUniqueId())){
            player.sendMessage("§6[传送系统]§r 你已在一段传送中！");
            return;
        }
        FileManager.WarpPoint point=FileManager.points.get(id);
        if(!FileManager.stats.containsKey(player.getUniqueId())){
            FileManager.load(player);
        }
        FileManager.PlayerStat stat=FileManager.stats.get(player.getUniqueId());

        if(point.date==new Date().getDate()||point.date==-1){
            if(point.date!=-1) {
                if (stat.dayTeleportCounter.containsKey(id)) {
                    if (stat.dayTeleportCounter.get(id) >= 1) {
                        player.sendMessage("§6[传送系统]§r 今日该传送点的次数已经耗尽！");
                        return;
                    }
                }
            }
        }else{
            player.sendMessage("§6[传送系统]§r 未到该传送点开放日期！");
            return;
        }
        if(new Date().getDate()==stat.current) {
            if (stat.dayTeleportCounter.containsKey(id)) {
                if (stat.dayTeleportCounter.get(id) >= point.dayLimit) {
                    player.sendMessage("§6[传送系统]§r 今日该传送点的次数已经耗尽！");
                    return;
                }
            }
            if (stat.lastTeleportStamp.containsKey(id)) {
                long period = System.currentTimeMillis() - stat.lastTeleportStamp.get(id);
                if (period / 1000 < point.cooldown) {
                    player.sendMessage("§6[传送系统]§r 冷却未完毕，剩余§e" + turnToString(Math.toIntExact(point.cooldown - period / 1000)) + "§r！");
                    return;
                }
            }
        } else {
            stat.lastTeleportStamp=new HashMap<>();
            stat.dayTeleportCounter=new HashMap<>();
            stat.current=new Date().getDate();
            FileManager.save(player);
        }

        Location origin=player.getLocation();

        int tmp=stat.dayTeleportCounter.containsKey(id)?stat.dayTeleportCounter.get(id):0;
        stat.lastTeleportStamp.put(id,System.currentTimeMillis());
        stat.dayTeleportCounter.put(id,tmp+1);

        player.teleport(point.loc);
        player.sendMessage("§6[传送系统]§r 传送完成，§6"+turnToString(point.stayTime)+"§r后将传回！");

        boolean needKill=false;
        if(point.entityName!=null){
            if(!point.entityName.equalsIgnoreCase("null")){
                needKill=true;
            }
        }
        if(needKill){
            player.sendMessage("§6[传送系统]§r 请杀死生物§6"+point.entityName+"§r，否则该副本获得物品全部丢失，无法带回！");
            killTask.put(player.getUniqueId(),point.entityName);
        }

        boolean finalNeedKill = needKill;
        ItemStack[] items=player.getInventory().getContents().clone();
        currents.put(player.getUniqueId(),items);


        BukkitRunnable runnable=new BukkitRunnable(){
            int counter=0;
            @Override
            public void run() {
                if(!player.isOnline()){
                    currents.remove(player.getUniqueId());
                    cancel();
                    return;
                }
                if(!currents.containsKey(player.getUniqueId())){
                    cancel();
                    return;
                }
                counter++;
                if(point.stayTime - counter<=5 &&point.stayTime - counter>0) {
                    player.sendMessage("§6[传送系统]§r 时间还剩下§6" + (point.stayTime - counter) + "§r秒！");
                }
                if(counter>point.stayTime){
                    if(!currents.containsKey(player.getUniqueId())){
                        cancel();
                        return;
                    }
                    if(finalNeedKill){
                        if(killTask.containsKey(player.getUniqueId())){
                            player.sendMessage("§6[传送系统]§r 时间已到，未杀死生物§6"+point.entityName+"§r！");
                            ItemStack[] old=currents.get(player.getUniqueId());
                            currents.remove(player.getUniqueId());
                            player.getInventory().setContents(old);
                            player.teleport(origin);
                        }else{
                            //TODO
                        }
                    }else{
                        player.sendMessage("§6[传送系统]§r 时间已到，传回原位置！");
                        currents.remove(player.getUniqueId());
                        player.teleport(origin);
                    }
                    cancel();
                }
            }
        };
        runnable.runTaskTimer(AdvancedWarps.plugin,0L,20L);
    }
    public static HashMap<UUID,String> killTask=new HashMap<>();

    public static String turnToString(int time) {
        if (time <= 0) {
            return "";
        }
        int d = time / 3600 / 24;
        int h = time % (3600 * 24) / 3600;
        int m = time % 3600 / 60;
        int s = time % 60;
        if (d == 0) {
            if (h == 0) {
                if (m == 0) {
                    return s + "秒";
                } else {
                    return m + "分钟" + s + "秒";
                }
            } else {
                return h + "小时" + m + "分钟" + s + "秒";
            }
        } else {
            return d + "天" + h + "小时" + m + "分钟" + s + "秒";
        }
    }
}
