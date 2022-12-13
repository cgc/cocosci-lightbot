import { QUERY, saveBlob } from "../../../../optdisco/js/utils";
import { parseSerializedProgram } from "../../timeline";
import { animationFrames } from "./box";
import { deg2rad } from "./CameraControls";
import { startingView } from "./projection";

export async function snapshot(editor, game) {
  const programStr = QUERY.get('program');
  const program = parseSerializedProgram(programStr);

  // Start by resetting -- game should clear out the trajectory. reset() alone avoids clearing trajectory
  game.bot.reset();
  game.map.reset();

  // Set program in editor, then have it interpret/execute. Can't do game.check(program) since editor interprets.
  editor.setProgram(program);
  editor.execute({ check: true });

  // Set BG as white
  const bg = game.bg;
  game.bg = 'white';

  // Reset game to bring lightbot back -- notably this will keep trajectory.
  game.reset();
  // Reset state of each light so that's consistent.
  game.map.forEachBox(box => {
    box.currentAnimationFrame = animationFrames;
  });
  // Set the camera
  game.projection.setRotation({ vertical: startingView.vertical, horizontal: startingView.horizontal + 10 * deg2rad });
  // Now draw to canvas.
  game.update();

  // restore BG
  game.bg = bg;

  // Make filename
  const mapSource = QUERY.get('mapSource');
  const mapIdx = QUERY.get('mapIdx');
  let info = '';
  if (mapSource && mapIdx) {
    info += `-${mapSource}${mapIdx}`;
  }
  // Removing pipes since it seems like they're invalid in filenames
  const fn = `screenshot${info}-prog,${programStr.replace(/\|/g, ',')}.png`;

  // Now save and download.
  const blob = await new Promise(resolve => game.canvas.toBlob(resolve));
  saveBlob(fn, blob);
}
