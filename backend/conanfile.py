from conan import ConanFile
from conan.tools.cmake import cmake_layout

class CnnCrowServerRecipe(ConanFile):
    name = "cnn_crow_server"
    version = "1.0"

    # Target system settings probed during build
    settings = "os", "compiler", "build_type", "arch"

    # Modern Conan 2 Generators for CMake integration
    generators = "CMakeDeps", "CMakeToolchain"

    def requirements(self):
        """Declare your third-party external dependencies."""
        self.requires("crowcpp-crow/1.3.2")
        # self.requires("nlohmann_json/3.11.3")
        # self.requires("fmt/10.2.1")

    def layout(self):
        """
        Organizes generated toolchains and presets into standard folders 
        (e.g., build/Release or build/Debug) and outputs CMakePresets.json.
        """
        cmake_layout(self)
