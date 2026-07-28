cmake_minimum_required(VERSION 3.15)
project(VisionEngine CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find the pre-compiled Arch libraries
find_package(OpenCV REQUIRED)
find_package(Tesseract REQUIRED)

# Create your executable
add_executable(vision_engine main.cpp)

# Link them (Crow is header-only, so we just need to link pthread for its async server)
target_link_libraries(vision_engine PRIVATE
    ${OpenCV_LIBS}
    Tesseract::Tesseract
    pthread
)