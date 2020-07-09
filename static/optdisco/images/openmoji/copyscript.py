import os
import shutil

graphics = [
  '🎈','🔑','🎀','🎁','🛒','📚','📌','✏️','🔮','🔨','💰','⚙️','💎','💡','⏰','🚲',
  '✈️','🎣','🍫','🍎','🧀','🍌','🍪','🌞','⛄️','🐒','🐳','👑','👟','🤖','🤡',
  # new ones
  '⭐', '⚫', '⬛','❔','✳',
]

source = '/Users/carlos/Downloads/openmoji-svg-color'
dest = '/Users/carlos/pu/cocosci-optdisco/static/optdisco/images/openmoji'

for item in graphics:
    name = item.encode('unicode-escape')[2:].lstrip(b'0').upper().decode('ascii')
    name = name.replace('\\UFE0F', '')
    fn = name+'.svg'
    source_path = os.path.join(source, fn)
    shutil.copyfile(source_path, os.path.join(dest, fn))
