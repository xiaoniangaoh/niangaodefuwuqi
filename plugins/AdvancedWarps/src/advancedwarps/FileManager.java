package advancedwarps;

import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.scheduler.BukkitRunnable;

import java.io.File;
import java.io.IOException;
import java.util.Date;
import java.util.HashMap;
import java.util.UUID;

public class FileManager implements Listener {
    public static HashMap<String,WarpPoint> points=new HashMap<>();
    public static HashMap<UUID,PlayerStat> stats=new HashMap<>();
    public static void initialize(AdvancedWarps plugin){
        File directory=new File(plugin.getDataFolder()+"/points/");
        if(!directory.exists()){
            directory.mkdir();
        }
        for(File file:directory.listFiles()){
            if(!file.isFile())
                continue;
            YamlConfiguration yaml=YamlConfiguration.loadConfiguration(file);
            String id=file.getName().replace(".yml","");
            Location loc=new Location(
                    Bukkit.getWorld(yaml.getString("world")),
                    yaml.getDouble("x"),
                    yaml.getDouble("y"),
                    yaml.getDouble("z")
            );
            WarpPoint point=new WarpPoint(
                    id,loc,
                    yaml.getInt("cooldown"),
                    yaml.getInt("stayTime"),
                    yaml.getInt("dayLimit"),
                    yaml.getString("entityName"),
                    yaml.contains("date")?yaml.getInt("date"):-1
            );
            points.put(id,point);
        }

        new BukkitRunnable(){
            @Override
            public void run() {
                for(Player player:Bukkit.getOnlinePlayers()){
                    save(player);
                }
            }
        }.runTaskTimer(plugin,0L,30L);
    }
    public static void addPoint(String id,Player player){
        WarpPoint point=new WarpPoint(id,player.getLocation(),60,20,10,null,-1);
        points.put(id,point);
        save(point);
    }
    public static void delPoint(String id){
        points.remove(id);
        File file=new File(AdvancedWarps.plugin.getDataFolder()+"/points/",id+".yml");
        if(file.exists()){
            file.delete();
        }
    }
    public static void modifyLoc(String id,Location loc){
        WarpPoint point=points.get(id);
        point.loc=loc;
        save(point);
    }
    public static void modifyCooldown(String id,int cd){
        WarpPoint point=points.get(id);
        point.cooldown=cd;
        save(point);
    }
    public static void modifyStayTime(String id,int time){
        WarpPoint point=points.get(id);
        point.stayTime=time;
        save(point);
    }
    public static void modifyDayLimit(String id,int limit){
        WarpPoint point=points.get(id);
        point.dayLimit=limit;
        save(point);
    }
    public static void modifyEntityName(String id,String name){
        WarpPoint point=points.get(id);
        point.entityName=name;
        save(point);
    }
    public static void modifyDate(String id,int date){
        WarpPoint point=points.get(id);
        point.date=date;
        save(point);
    }
    public static void save(WarpPoint point){
        File file=new File(AdvancedWarps.plugin.getDataFolder()+"/points/",point.id+".yml");
        if(file.exists()){
            file.delete();
        }
        YamlConfiguration yaml=YamlConfiguration.loadConfiguration(file);
        yaml.set("world",point.loc.getWorld().getName());
        yaml.set("x",point.loc.getX());
        yaml.set("y",point.loc.getY());
        yaml.set("z",point.loc.getZ());
        yaml.set("cooldown",point.cooldown);
        yaml.set("stayTime",point.stayTime);
        yaml.set("dayLimit",point.dayLimit);
        yaml.set("entityName",point.entityName);
        yaml.set("date",point.date);
        try {
            yaml.save(file);
        } catch (IOException e) {
            AdvancedWarps.plugin.getLogger().info("保存传送点"+point.id+"的数据时出现错误！");
        }
    }
    @EventHandler
    public void onJoin(PlayerJoinEvent event){
        load(event.getPlayer());
    }
    @EventHandler
    public void onQuit(PlayerJoinEvent event){
        save(event.getPlayer());
    }
    public static void load(Player player){
        File file=new File(AdvancedWarps.plugin.getDataFolder()+"/stat/",player.getUniqueId()+".yml");
        if(!file.exists()){
            stats.put(player.getUniqueId(),new PlayerStat(new HashMap<>(),new HashMap<>(),new Date().getDate()));
            return;
        }
        YamlConfiguration yaml=YamlConfiguration.loadConfiguration(file);
        if(yaml.getInt("date")!=new Date().getDate()){
            stats.put(player.getUniqueId(),new PlayerStat(new HashMap<>(),new HashMap<>(),new Date().getDate()));
            return;
        }
        HashMap<String,Long> lastTeleportStamp = new HashMap<>();
        HashMap<String,Integer> dayTeleportCounter = new HashMap<>();
        if(yaml.getMapList("lastTeleportStamp").size()!=0) {
            lastTeleportStamp = (HashMap<String, Long>) yaml.getMapList("lastTeleportStamp").get(0);
        }
        if(yaml.getMapList("dayTeleportCounter").size()!=0) {
            dayTeleportCounter = (HashMap<String, Integer>) yaml.getMapList("dayTeleportCounter").get(0);
        }
        stats.put(player.getUniqueId(),new PlayerStat(lastTeleportStamp,dayTeleportCounter,
                yaml.getInt("date")));
    }
    public static void save(Player player){
        File file=new File(AdvancedWarps.plugin.getDataFolder()+"/stat/",player.getUniqueId()+".yml");
        if(!stats.containsKey(player.getUniqueId())){
            return;
        }
        YamlConfiguration yaml=YamlConfiguration.loadConfiguration(file);
        PlayerStat stat=stats.get(player.getUniqueId());
        yaml.set("lastTeleportStamp",stat.lastTeleportStamp);
        yaml.set("dayTeleportCounter",stat.dayTeleportCounter);
        yaml.set("date",stat.current);
        try {
            yaml.save(file);
        } catch (IOException e) {
            AdvancedWarps.plugin.getLogger().info("保存玩家"+player.getName()+"的传送数据时出现错误！");
        }
    }

    public static class PlayerStat {
        public HashMap<String,Long> lastTeleportStamp=new HashMap<>();
        public HashMap<String,Integer> dayTeleportCounter=new HashMap<>();
        public int current; //date

        public PlayerStat(HashMap<String, Long> lastTeleportStamp, HashMap<String, Integer> dayTeleportCounter,int current) {
            this.lastTeleportStamp = lastTeleportStamp;
            this.dayTeleportCounter = dayTeleportCounter;
            this.current=current;
        }
    }

    public static class WarpPoint {
        public String id;
        public Location loc;
        public int cooldown;
        public int stayTime;
        public int dayLimit;
        public String entityName;
        public int date;

        public WarpPoint(String id,Location loc, int cooldown, int stayTime, int dayLimit,String entityName,int date) {
            this.id=id;
            this.loc = loc;
            this.cooldown = cooldown;
            this.stayTime = stayTime;
            this.dayLimit = dayLimit;
            this.entityName=entityName;
            this.date=date;
        }
    }
}
