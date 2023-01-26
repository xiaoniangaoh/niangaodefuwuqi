package advancedwarps;

import com.sun.istack.internal.NotNull;
import me.clip.placeholderapi.expansion.PlaceholderExpansion;
import org.bukkit.OfflinePlayer;
import org.bukkit.entity.Player;

public class PapiExpansion extends PlaceholderExpansion {

    public @NotNull
    String getAuthor() {
        return "[南外丶仓鼠 ]";
    }

    public @NotNull
    String getIdentifier() {
        return "aw";
    }

    public @NotNull
    String getVersion() {
        return "1.0";
    }

    @Override
    public String onRequest(OfflinePlayer off_player, @NotNull String identifier) {
        if (off_player == null) {
            return null;
        }
        Player player = off_player.getPlayer();
        if (player == null) {
            return "";
        }
        FileManager.PlayerStat stat=FileManager.stats.get(player.getUniqueId());
        FileManager.WarpPoint point=FileManager.points.get(player.getUniqueId());
        if(identifier.startsWith("cd")){
            String id=identifier.replace("cd_","");
            if(stat.lastTeleportStamp.containsKey(id)){
                long tmp=stat.lastTeleportStamp.get(id);
                return Commands.turnToString(Math.toIntExact(point.cooldown - (System.currentTimeMillis() - tmp) / 1000));
            }else{
                return Commands.turnToString(0);
            }
        }
        if(identifier.startsWith("last")){
            String id=identifier.replace("last_","");
            if(stat.dayTeleportCounter.containsKey(id)){
                long tmp=stat.dayTeleportCounter.get(id);
                return String.valueOf(point.dayLimit-tmp);
            }else{
                return String.valueOf(point.dayLimit);
            }
        }
        return identifier;
    }
}
