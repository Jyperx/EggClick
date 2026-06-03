import os

search = 'os.environ["JWT_SECRET"]'
replace = 'os.environ["JWT_SECRET"]'

for root, _, files in os.walk('j:/PROYECTOS/Egg/backend'):
    if 'venv' in root:
        continue
    for f in files:
        if f.endswith('.py'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            if search in content:
                print(f'Patching {path}')
                content = content.replace(search, replace)
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(content)
