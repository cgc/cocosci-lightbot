import os
import shutil
import json

graphics = [
  '🎈','🔑','🎀','🎁','🛒','📚','📌','✏️','🔮','🔨','💰','⚙️','💎','💡','⏰','🚲',
  '✈️','🎣','🍫','🍎','🧀','🍌','🍪','🌞','⛄️','🐒','🐳','👑','👟','🤖','🤡',
  # new ones
  '⭐', '⚫', '⬛','❔','✳','✴',
]

source = '/Users/carlos/Downloads/openmoji-svg-color'
dest = '/Users/carlos/pu/cocosci-optdisco/static/optdisco/images/openmoji'
jj = {}

for item in graphics:
    name = item.encode('unicode-escape')[2:].lstrip(b'0').upper().decode('ascii')
    name = name.replace('\\UFE0F', '')
    fn = name+'.svg'
    source_path = os.path.join(source, fn)
    shutil.copyfile(source_path, os.path.join(dest, fn))
    with open(source_path, 'r') as f:
        jj[name] = f.read()

with open(os.path.join(dest, 'openmoji.js'), 'w') as f:
    f.write(f'export default {json.dumps(jj, indent=2)};')
