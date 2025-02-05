import json
from ytmusicapi import YTMusic


with open('ytclient.json', 'r') as f:
    ytclient = json.load(f)

class OAuthCredentials:
    client_id=ytclient["client_id"]
    client_secret=ytclient["client_secret"]

ytmusic = YTMusic('./oauth.json', oauth_credentials=OAuthCredentials())
import json

library_songs = ytmusic.get_library_songs(limit=1000)
# print(library_songs)  

with open("raw_youtube_likes.json", "w") as outfile:
    json.dump(library_songs, outfile)
    print("Done!")