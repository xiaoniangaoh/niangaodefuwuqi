package advancedwarps;

import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;

public class AdvancedWarps extends JavaPlugin {
    public static AdvancedWarps plugin;
    @Override
    public void onEnable(){
        if(initPAPI()){
            new PapiExpansion().register();
        }
        AdvancedWarps.plugin=this;

        this.getCommand("aw").setExecutor(new Commands());
        Bukkit.getPluginManager().registerEvents(new Commands.EventListener(),this);
        FileManager.initialize(this);
        Bukkit.getPluginManager().registerEvents(new FileManager(),this);

        getLogger().info("插件启动完成，输入/aw help查看帮助！");

        for(Player player:Bukkit.getOnlinePlayers()){
            FileManager.load(player);
        }

    }

    @Override
    public void onDisable(){
        for(Player player:Bukkit.getOnlinePlayers()){
            FileManager.save(player);
        }
    }

    public static boolean initPAPI() {
        return true;
    }
}
