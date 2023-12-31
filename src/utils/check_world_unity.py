import UnityPy
import os
import sys

platforms = {
    "StandaloneWindows": "windows",
    "StandaloneWindows64": "windows",
    "StandaloneLinux64": "linux",
    "StandaloneLinuxUniversal": "linux",
    "StandaloneLinux": "linux",
    "NoTarget": "unknown",
}


def main():
    if len(sys.argv) < 2:
        raise ValueError("Missing file path argument")
    path = sys.argv[1]

    if not os.path.exists(path):
        raise FileNotFoundError(f"File '{path}' not found")

    env = UnityPy.load(path)

    if not env:
        raise ValueError(f"File '{path}' is not a valid Unity asset file")

    content_type = None
    counter = {}
    pl = None
    for obj in env.objects:
        if hasattr(obj, "platform") and hasattr(obj.platform, "name"):
            pl = obj.platform.name
        if obj.type.name not in counter:
            counter[obj.type.name] = 0
        counter[obj.type.name] += 1

        if obj.type.name == "MonoBehaviour":
            re = obj.read()
            if hasattr(re.type_tree, "ContentType"):
                content_type = re.type_tree.ContentType

    if(content_type == None):
        raise ValueError(f"File '{path}' is not a valid Unity asset file")

    import json
    print(json.dumps({
        "content_type": content_type,
        "platform": platforms[pl],
        "name": env.file.name,
        "engine": "unity",
        "engine_version": env.file.version_engine,
        "stats": counter
    }, indent=4))


if __name__ == "__main__":
    main()
